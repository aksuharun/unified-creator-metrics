import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createKickChatClient } from "../../src/providers/kick/chat.js"
import { createKickClient } from "../../src/kick.js"

describe("createKickChatClient().sendMessage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("sends a user chat message to the requested broadcaster", async () => {
        const createdAt = "2026-05-21T10:45:00Z"
        const responsePayload = {
            data: {
                id: "kick-message-1",
                created_at: createdAt,
            },
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const chat = createKickChatClient({ userAccessToken: "kick-token" })
        const result = await chat.sendMessage({
            broadcasterUserId: 123,
            text: "Hello Kick chat",
            includeRaw: true,
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe("https://api.kick.com/public/v1/chat")
        expect(init).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer kick-token",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(init?.body))).toEqual({
            broadcaster_user_id: 123,
            content: "Hello Kick chat",
            type: "user",
        })
        expect(result).toEqual({
            platform: "kick",
            messageId: "kick-message-1",
            sentAt: new Date(createdAt).toISOString(),
            raw: responsePayload,
        })
    })

    it("sends a bot chat message without a broadcaster id", async () => {
        const responsePayload = {
            data: {
                message_id: 987,
            },
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const chat = createKickChatClient({ userAccessToken: "kick-token" })
        const result = await chat.sendMessage({
            type: "bot",
            text: "Hello from bot",
        })

        const [, init] = fetchMock.mock.calls[0]
        expect(JSON.parse(String(init?.body))).toEqual({
            content: "Hello from bot",
            type: "bot",
        })
        expect(result).toMatchObject({
            platform: "kick",
            messageId: "987",
        })
        expect(Date.parse(result.sentAt)).not.toBe(Number.NaN)
    })

    it("rejects user messages without a positive broadcaster id", async () => {
        const fetchMock = vi.mocked(fetch)
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        await expect(
            chat.sendMessage({
                broadcasterUserId: 0,
                text: "Hello Kick chat",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("wraps Kick API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
        )
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        await expect(
            chat.sendMessage({
                broadcasterUserId: 123,
                text: "Hello Kick chat",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "kick",
            status: 403,
        })
    })

    it("refreshes a stale Kick user token and retries the send once", async () => {
        const fetchMock = vi.mocked(fetch)
        const onUserTokenUpdate = vi.fn()
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
            }),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: "fresh-kick-user-token",
                    refresh_token: "fresh-kick-refresh-token",
                    expires_in: 3600,
                    scope: "chat:write",
                    token_type: "Bearer",
                }),
                { status: 200 },
            ),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: {
                        id: "kick-message-2",
                        created_at: "2026-05-22T11:00:00Z",
                    },
                }),
                { status: 200 },
            ),
        )

        const kick = createKickClient({
            clientId: "kick-client-id",
            clientSecret: "kick-client-secret",
            userAccessToken: "stale-kick-user-token",
            userRefreshToken: "stale-kick-refresh-token",
            onUserTokenUpdate,
        })
        const result = await kick.chat.sendMessage({
            broadcasterUserId: 123,
            text: "Hello after refresh",
        })

        const firstApiCall = fetchMock.mock.calls[0]
        expect(String(firstApiCall[0])).toBe("https://api.kick.com/public/v1/chat")
        expect(firstApiCall[1]).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer stale-kick-user-token",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(firstApiCall[1]?.body))).toEqual({
            broadcaster_user_id: 123,
            content: "Hello after refresh",
            type: "user",
        })

        const tokenRefreshCall = fetchMock.mock.calls[1]
        expect(String(tokenRefreshCall[0])).toBe("https://id.kick.com/oauth/token")
        expect(tokenRefreshCall[1]).toMatchObject({
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        const tokenRefreshBody = new URLSearchParams(
            String(tokenRefreshCall[1]?.body),
        )
        expect(tokenRefreshBody.get("client_id")).toBe("kick-client-id")
        expect(tokenRefreshBody.get("client_secret")).toBe("kick-client-secret")
        expect(tokenRefreshBody.get("grant_type")).toBe("refresh_token")
        expect(tokenRefreshBody.get("refresh_token")).toBe("stale-kick-refresh-token")

        const secondApiCall = fetchMock.mock.calls[2]
        expect(String(secondApiCall[0])).toBe("https://api.kick.com/public/v1/chat")
        expect(secondApiCall[1]).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer fresh-kick-user-token",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(secondApiCall[1]?.body))).toEqual({
            broadcaster_user_id: 123,
            content: "Hello after refresh",
            type: "user",
        })
        expect(onUserTokenUpdate).toHaveBeenCalledWith({
            accessToken: "fresh-kick-user-token",
            refreshToken: "fresh-kick-refresh-token",
            expiresIn: 3600,
            expiresAt: expect.any(String),
            scope: "chat:write",
            tokenType: "Bearer",
        })
        expect(result).toMatchObject({
            platform: "kick",
            messageId: "kick-message-2",
        })
    })
})
