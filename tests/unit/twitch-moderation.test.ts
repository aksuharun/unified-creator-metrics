import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createTwitchChatClient } from "../../src/providers/twitch/chat.js"

describe("createTwitchChatClient() moderation", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
        vi.useRealTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("deletes a Twitch chat message using the validated moderator id", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["moderator:manage:chat_messages"],
        }))
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
        const chat = createTwitchChatClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        const result = await chat.deleteMessage({
            broadcasterId: "123",
            messageId: "message-1",
        })

        const [validateUrl, validateInit] = fetchMock.mock.calls[0]
        expect(String(validateUrl)).toBe("https://id.twitch.tv/oauth2/validate")
        expect(validateInit).toMatchObject({
            headers: {
                Authorization: "OAuth twitch-user-token",
            },
        })

        const [apiUrl, apiInit] = fetchMock.mock.calls[1]
        expect(String(apiUrl)).toBe(
            "https://api.twitch.tv/helix/moderation/chat?broadcaster_id=123&moderator_id=456&message_id=message-1",
        )
        expect(apiInit).toMatchObject({
            method: "DELETE",
            headers: {
                Authorization: "Bearer twitch-user-token",
                "Client-Id": "twitch-client-id",
                "Content-Type": "application/json",
            },
        })
        expect(result).toEqual({
            platform: "twitch",
            messageId: "message-1",
        })
    })

    it("bans and timeouts a user using the same moderation vocabulary", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["moderator:manage:banned_users"],
        }))
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            user_id: "987",
                        },
                    ],
                }),
                { status: 200 },
            ),
        )
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["moderator:manage:banned_users"],
        }))
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            user_id: "987",
                            end_time: "2026-05-25T09:02:00Z",
                        },
                    ],
                }),
                { status: 200 },
            ),
        )
        const chat = createTwitchChatClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        const banResult = await chat.banUser({
            broadcasterId: "123",
            userId: "987",
            reason: "sensitive message",
            includeRaw: true,
        })
        const timeoutResult = await chat.timeoutUser({
            broadcasterId: "123",
            userId: "987",
            durationSeconds: 120,
        })

        const [, banInit] = fetchMock.mock.calls[1]
        expect(JSON.parse(String(banInit?.body))).toEqual({
            data: {
                user_id: "987",
                reason: "sensitive message",
            },
        })
        const [, timeoutInit] = fetchMock.mock.calls[3]
        expect(JSON.parse(String(timeoutInit?.body))).toEqual({
            data: {
                user_id: "987",
                duration: 120,
            },
        })
        expect(banResult).toEqual({
            platform: "twitch",
            userId: "987",
            banId: null,
            expiresAt: null,
            raw: {
                data: [
                    {
                        user_id: "987",
                    },
                ],
            },
        })
        expect(timeoutResult).toEqual({
            platform: "twitch",
            userId: "987",
            banId: null,
            durationSeconds: 120,
            expiresAt: "2026-05-25T09:02:00.000Z",
        })
    })

    it("unbans a user using the validated moderator id", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["moderator:manage:banned_users"],
        }))
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
        const chat = createTwitchChatClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        const result = await chat.unbanUser({
            broadcasterId: "123",
            userId: "987",
        })

        const [apiUrl] = fetchMock.mock.calls[1]
        expect(String(apiUrl)).toBe(
            "https://api.twitch.tv/helix/moderation/bans?broadcaster_id=123&moderator_id=456&user_id=987",
        )
        expect(result).toEqual({
            platform: "twitch",
            userId: "987",
            banId: null,
        })
    })

    it("rejects moderation when the required scope is missing", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["user:read:chat"],
        }))
        const chat = createTwitchChatClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            chat.deleteMessage({
                broadcasterId: "123",
                messageId: "message-1",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("wraps Twitch moderation API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["moderator:manage:banned_users"],
        }))
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
        )
        const chat = createTwitchChatClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            chat.banUser({
                broadcasterId: "123",
                userId: "987",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "twitch",
            status: 403,
        })
    })
})

function validatedTokenResponse(options: { scopes: string[] }): Response {
    return new Response(
        JSON.stringify({
            client_id: "twitch-client-id",
            user_id: "456",
            login: "moderator",
            scopes: options.scopes,
        }),
        { status: 200 },
    )
}
