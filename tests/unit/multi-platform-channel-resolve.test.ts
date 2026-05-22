import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { KickClient } from "../../src/providers/kick/types.js"
import type { TwitchClient } from "../../src/providers/twitch/types.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"

describe("createMultiPlatformClient().channels.resolve", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("routes YouTube lookups to the YouTube provider", async () => {
        const resolve = vi.fn().mockResolvedValue({
            platform: "youtube",
            channelId: "youtube-channel-1",
            handle: "@aksuharun",
            displayName: "Aksu Harun",
            fetchedAt: "2026-05-22T10:30:00.000Z",
        })
        const youtube = {
            platform: "youtube",
            channels: {
                resolve,
            },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.channels.resolve({
            platform: "youtube",
            handle: "aksuharun",
            includeRaw: true,
        })

        expect(resolve).toHaveBeenCalledWith({
            handle: "aksuharun",
            includeRaw: true,
        })
        expect(result).toEqual({
            platform: "youtube",
            channelId: "youtube-channel-1",
            handle: "@aksuharun",
            displayName: "Aksu Harun",
            fetchedAt: "2026-05-22T10:30:00.000Z",
        })
    })

    it("routes Kick lookups to the Kick provider", async () => {
        const resolve = vi.fn().mockResolvedValue({
            platform: "kick",
            broadcasterUserId: 123,
            slug: "aksuharun",
            displayName: "aksuharun",
            fetchedAt: "2026-05-22T10:45:00.000Z",
        })
        const kick = {
            platform: "kick",
            channels: {
                resolve,
            },
        } as unknown as KickClient
        const client = createMultiPlatformClient({ kick })

        const result = await client.channels.resolve({
            platform: "kick",
            slug: "aksuharun",
        })

        expect(resolve).toHaveBeenCalledWith({
            slug: "aksuharun",
            includeRaw: undefined,
        })
        expect(result).toEqual({
            platform: "kick",
            broadcasterUserId: 123,
            slug: "aksuharun",
            displayName: "aksuharun",
            fetchedAt: "2026-05-22T10:45:00.000Z",
        })
    })

    it("routes Twitch lookups to the Twitch provider", async () => {
        const resolve = vi.fn().mockResolvedValue({
            platform: "twitch",
            broadcasterId: "123456",
            login: "aksuharun",
            displayName: "AksuHarun",
            fetchedAt: "2026-05-22T10:50:00.000Z",
        })
        const twitch = {
            platform: "twitch",
            channels: {
                resolve,
            },
        } as unknown as TwitchClient
        const client = createMultiPlatformClient({ twitch })

        const result = await client.channels.resolve({
            platform: "twitch",
            login: "aksuharun",
            includeRaw: true,
        })

        expect(resolve).toHaveBeenCalledWith({
            login: "aksuharun",
            includeRaw: true,
        })
        expect(result).toEqual({
            platform: "twitch",
            broadcasterId: "123456",
            login: "aksuharun",
            displayName: "AksuHarun",
            fetchedAt: "2026-05-22T10:50:00.000Z",
        })
    })

    it("rejects lookups when the selected provider is not configured", async () => {
        const client = createMultiPlatformClient({})

        await expect(
            client.channels.resolve({
                platform: "youtube",
                handle: "@aksuharun",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })
})
