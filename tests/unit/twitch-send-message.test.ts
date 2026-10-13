import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createTwitchChatClient } from "../../src/providers/twitch/chat.js"

describe("createTwitchChatClient().sendMessage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("sends a Twitch chat message using the validated sender id", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["user:write:chat"],
        }))
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            message_id: "message-1",
                            is_sent: true,
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

        const result = await chat.sendMessage({
            broadcasterId: "123",
            text: "Hello Twitch chat",
            replyParentMessageId: "parent-1",
            includeRaw: true,
        })

        const [apiUrl, apiInit] = fetchMock.mock.calls[1]
        expect(String(apiUrl)).toBe("https://api.twitch.tv/helix/chat/messages")
        expect(apiInit).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer twitch-user-token",
                "Client-Id": "twitch-client-id",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(apiInit?.body))).toEqual({
            broadcaster_id: "123",
            sender_id: "456",
            message: "Hello Twitch chat",
            reply_parent_message_id: "parent-1",
        })
        expect(result).toMatchObject({
            platform: "twitch",
            messageId: "message-1",
            raw: {
                data: [
                    {
                        message_id: "message-1",
                        is_sent: true,
                    },
                ],
            },
        })
        expect(result.sentAt).toEqual(expect.any(String))
    })

    it("rejects sends when the required scope is missing", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["user:read:chat"],
        }))
        const chat = createTwitchChatClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            chat.sendMessage({
                broadcasterId: "123",
                text: "Hello Twitch chat",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("wraps Twitch rejected messages with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["user:write:chat"],
        }))
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            message_id: "message-1",
                            is_sent: false,
                            drop_reason: { code: "automod_held" },
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

        await expect(
            chat.sendMessage({
                broadcasterId: "123",
                text: "Hello Twitch chat",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "twitch",
        })
    })
})

function validatedTokenResponse(options: { scopes: string[] }): Response {
    return new Response(
        JSON.stringify({
            client_id: "twitch-client-id",
            user_id: "456",
            login: "sender",
            scopes: options.scopes,
        }),
        { status: 200 },
    )
}
