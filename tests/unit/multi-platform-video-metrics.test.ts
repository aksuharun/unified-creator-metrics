import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { KickClient } from "../../src/providers/kick/types.js"
import type { TwitchClient } from "../../src/providers/twitch/types.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"

describe("createMultiPlatformClient().videos.getMetrics", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("routes YouTube video metrics to the YouTube provider", async () => {
        const getMetrics = vi.fn().mockResolvedValue({
            platform: "youtube",
            videoId: "youtube-video-1",
            title: "Live stream",
            channelId: "youtube-channel-1",
            channelDisplayName: "Aksu Harun",
            likes: 100,
            views: 1000,
            concurrentViewers: 50,
            fetchedAt: "2026-05-22T11:10:00.000Z",
        })
        const youtube = {
            platform: "youtube",
            videos: {
                getMetrics,
            },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.videos.getMetrics({
            platform: "youtube",
            videoId: "youtube-video-1",
            metrics: ["likes", "views", "concurrentViewers"],
            includeRaw: true,
        })

        expect(getMetrics).toHaveBeenCalledWith({
            videoId: "youtube-video-1",
            metrics: ["likes", "views", "concurrentViewers"],
            includeRaw: true,
        })
        expect(result).toEqual({
            platform: "youtube",
            videoId: "youtube-video-1",
            title: "Live stream",
            channelId: "youtube-channel-1",
            channelDisplayName: "Aksu Harun",
            likes: 100,
            views: 1000,
            concurrentViewers: 50,
            fetchedAt: "2026-05-22T11:10:00.000Z",
        })
    })

    it("routes Twitch video metrics to the Twitch provider", async () => {
        const getMetrics = vi.fn().mockResolvedValue({
            platform: "twitch",
            videoId: "123456",
            title: "Live coding",
            channelId: "123456",
            channelDisplayName: "AksuHarun",
            likes: null,
            views: null,
            concurrentViewers: 321,
            fetchedAt: "2026-05-22T11:15:00.000Z",
        })
        const twitch = {
            platform: "twitch",
            videos: {
                getMetrics,
            },
        } as unknown as TwitchClient
        const client = createMultiPlatformClient({ twitch })

        const result = await client.videos.getMetrics({
            platform: "twitch",
            videoId: "123456",
            metrics: ["concurrentViewers"],
        })

        expect(getMetrics).toHaveBeenCalledWith({
            videoId: "123456",
            metrics: ["concurrentViewers"],
            includeRaw: undefined,
        })
        expect(result).toEqual({
            platform: "twitch",
            videoId: "123456",
            title: "Live coding",
            channelId: "123456",
            channelDisplayName: "AksuHarun",
            likes: null,
            views: null,
            concurrentViewers: 321,
            fetchedAt: "2026-05-22T11:15:00.000Z",
        })
    })

    it("routes Kick video metrics to the Kick provider", async () => {
        const getMetrics = vi.fn().mockResolvedValue({
            platform: "kick",
            videoId: "aksuharun",
            title: "Kick live",
            channelId: "123",
            channelDisplayName: "aksuharun",
            likes: null,
            views: null,
            concurrentViewers: 44,
            fetchedAt: "2026-05-22T11:20:00.000Z",
        })
        const kick = {
            platform: "kick",
            videos: {
                getMetrics,
            },
        } as unknown as KickClient
        const client = createMultiPlatformClient({ kick })

        const result = await client.videos.getMetrics({
            platform: "kick",
            videoId: "aksuharun",
            metrics: ["concurrentViewers"],
        })

        expect(getMetrics).toHaveBeenCalledWith({
            videoId: "aksuharun",
            metrics: ["concurrentViewers"],
            includeRaw: undefined,
        })
        expect(result).toEqual({
            platform: "kick",
            videoId: "aksuharun",
            title: "Kick live",
            channelId: "123",
            channelDisplayName: "aksuharun",
            likes: null,
            views: null,
            concurrentViewers: 44,
            fetchedAt: "2026-05-22T11:20:00.000Z",
        })
    })

    it("rejects requests when the selected provider is not configured", () => {
        const client = createMultiPlatformClient({})

        expect(() =>
            client.videos.getMetrics({
                platform: "twitch",
                videoId: "123456",
                metrics: ["concurrentViewers"],
            }),
        ).toThrow(PlatformValidationError)
    })
})
