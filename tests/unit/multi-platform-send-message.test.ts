import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { KickClient } from "../../src/providers/kick/types.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"

describe("createMultiPlatformClient().chats.sendMessage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("routes YouTube requests to the YouTube provider", async () => {
        const sendMessage = vi.fn().mockResolvedValue({
            platform: "youtube",
            messageId: "youtube-message-1",
            sentAt: "2026-05-21T10:30:00.000Z",
        })
        const youtube = {
            platform: "youtube",
            chat: {
                sendMessage,
            },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.chats.sendMessage({
            platform: "youtube",
            liveChatId: "live-chat-1",
            text: "Hello YouTube chat",
            includeRaw: true,
        })

        expect(sendMessage).toHaveBeenCalledWith({
            liveChatId: "live-chat-1",
            text: "Hello YouTube chat",
            includeRaw: true,
        })
        expect(result).toEqual({
            platform: "youtube",
            messageId: "youtube-message-1",
            sentAt: "2026-05-21T10:30:00.000Z",
        })
    })

    it("routes Kick user requests to the Kick provider", async () => {
        const sendMessage = vi.fn().mockResolvedValue({
            platform: "kick",
            messageId: "kick-message-1",
            sentAt: "2026-05-21T10:45:00.000Z",
        })
        const kick = {
            platform: "kick",
            chat: {
                sendMessage,
            },
        } as unknown as KickClient
        const client = createMultiPlatformClient({ kick })

        const result = await client.chats.sendMessage({
            platform: "kick",
            broadcasterUserId: 123,
            text: "Hello Kick chat",
        })

        expect(sendMessage).toHaveBeenCalledWith({
            type: undefined,
            broadcasterUserId: 123,
            text: "Hello Kick chat",
            includeRaw: undefined,
        })
        expect(result).toEqual({
            platform: "kick",
            messageId: "kick-message-1",
            sentAt: "2026-05-21T10:45:00.000Z",
        })
    })

    it("routes Kick bot requests without adding a broadcaster id", async () => {
        const sendMessage = vi.fn().mockResolvedValue({
            platform: "kick",
            messageId: "kick-message-2",
            sentAt: "2026-05-21T10:50:00.000Z",
        })
        const kick = {
            platform: "kick",
            chat: {
                sendMessage,
            },
        } as unknown as KickClient
        const client = createMultiPlatformClient({ kick })

        await client.chats.sendMessage({
            platform: "kick",
            type: "bot",
            text: "Hello from bot",
        })

        expect(sendMessage).toHaveBeenCalledWith({
            type: "bot",
            text: "Hello from bot",
            includeRaw: undefined,
        })
    })

    it("rejects requests when the selected provider is not configured", async () => {
        const client = createMultiPlatformClient({})

        await expect(
            client.chats.sendMessage({
                platform: "youtube",
                liveChatId: "live-chat-1",
                text: "Hello YouTube chat",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })
})
