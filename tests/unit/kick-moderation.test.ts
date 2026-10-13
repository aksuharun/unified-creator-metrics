import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createKickChatClient } from "../../src/providers/kick/chat.js"

describe("createKickChatClient() moderation", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
        vi.useRealTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("deletes a Kick chat message", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        const result = await chat.deleteMessage({
            messageId: "kick-message-1",
        })

        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe("https://api.kick.com/public/v1/chat/kick-message-1")
        expect(init).toMatchObject({
            method: "DELETE",
            headers: {
                Authorization: "Bearer kick-token",
            },
        })
        expect(result).toEqual({
            platform: "kick",
            messageId: "kick-message-1",
        })
    })

    it("bans a Kick user", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ data: { id: "ban-1" } }), { status: 200 }),
        )
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        const result = await chat.banUser({
            broadcasterUserId: 123,
            userId: 456,
            reason: "sensitive message",
            includeRaw: true,
        })

        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe("https://api.kick.com/public/v1/moderation/bans")
        expect(init).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer kick-token",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(init?.body))).toEqual({
            broadcaster_user_id: 123,
            user_id: 456,
            reason: "sensitive message",
        })
        expect(result).toEqual({
            platform: "kick",
            userId: "456",
            banId: "ban-1",
            expiresAt: null,
            raw: {
                data: {
                    id: "ban-1",
                },
            },
        })
    })

    it("converts timeout seconds into Kick minutes", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-05-25T09:00:00.000Z"))
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ data: {} }), { status: 200 }),
        )
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        const result = await chat.timeoutUser({
            broadcasterUserId: 123,
            userId: 456,
            durationSeconds: 120,
        })

        const [, init] = fetchMock.mock.calls[0]
        expect(JSON.parse(String(init?.body))).toEqual({
            broadcaster_user_id: 123,
            user_id: 456,
            duration: 2,
        })
        expect(result).toEqual({
            platform: "kick",
            userId: "456",
            banId: null,
            durationSeconds: 120,
            expiresAt: "2026-05-25T09:02:00.000Z",
        })
    })

    it("removes a Kick ban or timeout", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        const result = await chat.unbanUser({
            broadcasterUserId: 123,
            userId: 456,
        })

        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe("https://api.kick.com/public/v1/moderation/bans")
        expect(init).toMatchObject({
            method: "DELETE",
            headers: {
                Authorization: "Bearer kick-token",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(init?.body))).toEqual({
            broadcaster_user_id: 123,
            user_id: 456,
        })
        expect(result).toEqual({
            platform: "kick",
            userId: "456",
            banId: null,
        })
    })

    it("rejects Kick timeout durations that are not whole minutes", async () => {
        const fetchMock = vi.mocked(fetch)
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        await expect(
            chat.timeoutUser({
                broadcasterUserId: 123,
                userId: 456,
                durationSeconds: 90,
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("wraps Kick moderation API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
        )
        const chat = createKickChatClient({ userAccessToken: "kick-token" })

        await expect(
            chat.deleteMessage({
                messageId: "kick-message-1",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "kick",
            status: 403,
        })
    })
})
