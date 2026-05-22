import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createYoutubeChatClient } from "../../src/providers/youtube/chat.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"

describe("createYoutubeChatClient().sendMessage", () => {
    const insert = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("sends a text message to the requested live chat", async () => {
        const publishedAt = "2026-05-21T10:30:00Z"
        const responseData = {
            id: "youtube-message-1",
            snippet: {
                publishedAt,
            },
        }
        insert.mockResolvedValue({
            data: responseData,
        })

        const chat = createYoutubeChatClient({
            youtubeApiClient: {
                liveChatMessages: {
                    insert,
                },
            } as unknown as GoogleYoutubeClient,
        })

        const result = await chat.sendMessage({
            liveChatId: "live-chat-1",
            text: "Hello YouTube chat",
            includeRaw: true,
        })

        expect(insert).toHaveBeenCalledWith({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    liveChatId: "live-chat-1",
                    type: "textMessageEvent",
                    textMessageDetails: {
                        messageText: "Hello YouTube chat",
                    },
                },
            },
        })
        expect(result).toEqual({
            platform: "youtube",
            messageId: "youtube-message-1",
            sentAt: new Date(publishedAt).toISOString(),
            raw: responseData,
        })
    })

    it("rejects blank message text before calling the API", async () => {
        const chat = createYoutubeChatClient({
            youtubeApiClient: {
                liveChatMessages: {
                    insert,
                },
            } as unknown as GoogleYoutubeClient,
        })

        await expect(
            chat.sendMessage({
                liveChatId: "live-chat-1",
                text: "   ",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(insert).not.toHaveBeenCalled()
    })

    it("wraps Google API failures with platform context", async () => {
        insert.mockRejectedValue({
            response: {
                status: 403,
            },
        })
        const chat = createYoutubeChatClient({
            youtubeApiClient: {
                liveChatMessages: {
                    insert,
                },
            } as unknown as GoogleYoutubeClient,
        })

        await expect(
            chat.sendMessage({
                liveChatId: "live-chat-1",
                text: "Hello YouTube chat",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "youtube",
            status: 403,
        })
    })
})
