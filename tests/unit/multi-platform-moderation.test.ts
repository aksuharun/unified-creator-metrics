import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { KickClient } from "../../src/providers/kick/types.js"
import type { TwitchClient } from "../../src/providers/twitch/types.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"

describe("createMultiPlatformClient().chats moderation", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("routes deleteMessage to the selected provider", async () => {
        const deleteMessage = vi.fn().mockResolvedValue({
            platform: "youtube",
            messageId: "youtube-message-1",
        })
        const youtube = {
            platform: "youtube",
            chat: {
                deleteMessage,
            },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.chats.deleteMessage({
            platform: "youtube",
            messageId: "youtube-message-1",
            includeRaw: true,
        })

        expect(deleteMessage).toHaveBeenCalledWith({
            messageId: "youtube-message-1",
            includeRaw: true,
        })
        expect(result).toEqual({
            platform: "youtube",
            messageId: "youtube-message-1",
        })
    })

    it("routes banUser and timeoutUser with provider-native context fields", async () => {
        const banUser = vi.fn().mockResolvedValue({
            platform: "twitch",
            userId: "987",
            banId: null,
            expiresAt: null,
        })
        const timeoutUser = vi.fn().mockResolvedValue({
            platform: "kick",
            userId: "456",
            banId: null,
            durationSeconds: 120,
            expiresAt: "2026-05-25T09:02:00.000Z",
        })
        const twitch = {
            platform: "twitch",
            chat: {
                banUser,
            },
        } as unknown as TwitchClient
        const kick = {
            platform: "kick",
            chat: {
                timeoutUser,
            },
        } as unknown as KickClient
        const client = createMultiPlatformClient({ twitch, kick })

        await client.chats.banUser({
            platform: "twitch",
            broadcasterId: "123",
            userId: "987",
            reason: "sensitive message",
        })
        await client.chats.timeoutUser({
            platform: "kick",
            broadcasterUserId: 321,
            userId: 456,
            durationSeconds: 120,
        })

        expect(banUser).toHaveBeenCalledWith({
            broadcasterId: "123",
            userId: "987",
            reason: "sensitive message",
            includeRaw: undefined,
        })
        expect(timeoutUser).toHaveBeenCalledWith({
            broadcasterUserId: 321,
            userId: 456,
            durationSeconds: 120,
            reason: undefined,
            includeRaw: undefined,
        })
    })

    it("routes unbanUser to the selected provider", async () => {
        const unbanUser = vi.fn().mockResolvedValue({
            platform: "youtube",
            userId: null,
            banId: "youtube-ban-1",
        })
        const youtube = {
            platform: "youtube",
            chat: {
                unbanUser,
            },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.chats.unbanUser({
            platform: "youtube",
            banId: "youtube-ban-1",
        })

        expect(unbanUser).toHaveBeenCalledWith({
            banId: "youtube-ban-1",
            includeRaw: undefined,
        })
        expect(result).toEqual({
            platform: "youtube",
            userId: null,
            banId: "youtube-ban-1",
        })
    })

    it("rejects moderation requests when the selected provider is not configured", async () => {
        const client = createMultiPlatformClient({})

        await expect(
            client.chats.deleteMessage({
                platform: "twitch",
                broadcasterId: "123",
                messageId: "message-1",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })
})
