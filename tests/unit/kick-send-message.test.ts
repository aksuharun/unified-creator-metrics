import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createKickChatClient } from "../../src/providers/kick/chat.js"

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

        const chat = createKickChatClient({ accessToken: "kick-token" })
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

        const chat = createKickChatClient({ accessToken: "kick-token" })
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
        const chat = createKickChatClient({ accessToken: "kick-token" })

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
        const chat = createKickChatClient({ accessToken: "kick-token" })

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
})
