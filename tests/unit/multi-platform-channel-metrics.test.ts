import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { TwitchClient } from "../../src/providers/twitch/types.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"

describe("createMultiPlatformClient().channels.getMetrics", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("routes YouTube channel metrics to the YouTube provider", async () => {
        const getMetrics = vi.fn().mockResolvedValue({
            platform: "youtube",
            channelId: "youtube-channel-1",
            displayName: "Aksu Harun",
            followers: 100,
            views: 1000,
            fetchedAt: "2026-05-22T11:00:00.000Z",
        })
        const youtube = {
            platform: "youtube",
            channels: {
                getMetrics,
            },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.channels.getMetrics({
            platform: "youtube",
            channelId: "youtube-channel-1",
            metrics: ["followers", "views"],
            includeRaw: true,
        })

        expect(getMetrics).toHaveBeenCalledWith({
            channelId: "youtube-channel-1",
            metrics: ["followers", "views"],
            includeRaw: true,
        })
        expect(result).toEqual({
            platform: "youtube",
            channelId: "youtube-channel-1",
            displayName: "Aksu Harun",
            followers: 100,
            views: 1000,
            fetchedAt: "2026-05-22T11:00:00.000Z",
        })
    })

    it("routes Twitch channel metrics to the Twitch provider", async () => {
        const getMetrics = vi.fn().mockResolvedValue({
            platform: "twitch",
            channelId: "123456",
            displayName: null,
            followers: 42,
            views: null,
            fetchedAt: "2026-05-22T11:05:00.000Z",
        })
        const twitch = {
            platform: "twitch",
            channels: {
                getMetrics,
            },
        } as unknown as TwitchClient
        const client = createMultiPlatformClient({ twitch })

        const result = await client.channels.getMetrics({
            platform: "twitch",
            channelId: "123456",
            metrics: ["followers"],
        })

        expect(getMetrics).toHaveBeenCalledWith({
            channelId: "123456",
            metrics: ["followers"],
            includeRaw: undefined,
        })
        expect(result).toEqual({
            platform: "twitch",
            channelId: "123456",
            displayName: null,
            followers: 42,
            views: null,
            fetchedAt: "2026-05-22T11:05:00.000Z",
        })
    })

    it("rejects metrics when the selected provider is not configured", async () => {
        const client = createMultiPlatformClient({})

        expect(() =>
            client.channels.getMetrics({
                platform: "twitch",
                channelId: "123456",
                metrics: ["followers"],
            }),
        ).toThrow(PlatformValidationError)
    })
})
