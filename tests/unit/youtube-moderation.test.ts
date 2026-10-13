import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createYoutubeChatClient } from "../../src/providers/youtube/chat.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"

describe("createYoutubeChatClient() moderation", () => {
    const deleteMessage = vi.fn()
    const insertBan = vi.fn()
    const deleteBan = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useRealTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("deletes a YouTube live chat message through the SDK", async () => {
        deleteMessage.mockResolvedValue({ data: undefined })
        const chat = createChatClient()

        const result = await chat.deleteMessage({
            messageId: "youtube-message-1",
        })

        expect(deleteMessage).toHaveBeenCalledWith({
            id: "youtube-message-1",
        })
        expect(result).toEqual({
            platform: "youtube",
            messageId: "youtube-message-1",
        })
    })

    it("creates a permanent live chat ban with the SDK", async () => {
        insertBan.mockResolvedValue({
            data: {
                id: "youtube-ban-1",
                snippet: {
                    bannedUserDetails: {
                        channelId: "youtube-user-1",
                    },
                },
            },
        })
        const chat = createChatClient()

        const result = await chat.banUser({
            liveChatId: "live-chat-1",
            userId: "youtube-user-1",
            includeRaw: true,
        })

        expect(insertBan).toHaveBeenCalledWith({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    liveChatId: "live-chat-1",
                    type: "permanent",
                    bannedUserDetails: {
                        channelId: "youtube-user-1",
                    },
                },
            },
        })
        expect(result).toEqual({
            platform: "youtube",
            userId: "youtube-user-1",
            banId: "youtube-ban-1",
            expiresAt: null,
            raw: {
                id: "youtube-ban-1",
                snippet: {
                    bannedUserDetails: {
                        channelId: "youtube-user-1",
                    },
                },
            },
        })
    })

    it("creates a temporary live chat ban with a normalized timeout result", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-05-25T09:00:00.000Z"))
        insertBan.mockResolvedValue({
            data: {
                id: "youtube-timeout-1",
                snippet: {
                    banDurationSeconds: "120",
                    bannedUserDetails: {
                        channelId: "youtube-user-1",
                    },
                },
            },
        })
        const chat = createChatClient()

        const result = await chat.timeoutUser({
            liveChatId: "live-chat-1",
            userId: "youtube-user-1",
            durationSeconds: 120,
        })

        expect(insertBan).toHaveBeenCalledWith({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    liveChatId: "live-chat-1",
                    type: "temporary",
                    banDurationSeconds: "120",
                    bannedUserDetails: {
                        channelId: "youtube-user-1",
                    },
                },
            },
        })
        expect(result).toEqual({
            platform: "youtube",
            userId: "youtube-user-1",
            banId: "youtube-timeout-1",
            durationSeconds: 120,
            expiresAt: "2026-05-25T09:02:00.000Z",
        })
    })

    it("removes a live chat ban through the SDK", async () => {
        deleteBan.mockResolvedValue({ data: undefined })
        const chat = createChatClient()

        const result = await chat.unbanUser({
            banId: "youtube-ban-1",
        })

        expect(deleteBan).toHaveBeenCalledWith({
            id: "youtube-ban-1",
        })
        expect(result).toEqual({
            platform: "youtube",
            userId: null,
            banId: "youtube-ban-1",
        })
    })

    it("rejects invalid moderation requests before calling the SDK", async () => {
        const chat = createChatClient()

        await expect(
            chat.timeoutUser({
                liveChatId: "live-chat-1",
                userId: "youtube-user-1",
                durationSeconds: 0,
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(insertBan).not.toHaveBeenCalled()
    })

    it("wraps SDK moderation failures with platform context", async () => {
        insertBan.mockRejectedValue({
            response: {
                status: 403,
            },
        })
        const chat = createChatClient()

        await expect(
            chat.banUser({
                liveChatId: "live-chat-1",
                userId: "youtube-user-1",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "youtube",
            status: 403,
        })
    })

    function createChatClient() {
        return createYoutubeChatClient({
            youtubeApiClient: {
                liveChatMessages: {
                    delete: deleteMessage,
                },
                liveChatBans: {
                    insert: insertBan,
                    delete: deleteBan,
                },
            } as unknown as GoogleYoutubeClient,
        })
    }
})
