import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"
import type { TwitchClient } from "../../src/providers/twitch/types.js"
import type { KickClient } from "../../src/providers/kick/types.js"

describe("createMultiPlatformClient().livestreams", () => {
    const youtubeGetActive = vi.fn()
    const youtubeGetScheduled = vi.fn()
    const twitchGetActive = vi.fn()
    const twitchGetScheduled = vi.fn()
    const kickGetActive = vi.fn()

    const mockYoutube = {
        platform: "youtube",
        livestreams: {
            getActive: youtubeGetActive,
            getScheduled: youtubeGetScheduled,
        },
    } as unknown as YoutubeClient

    const mockTwitch = {
        platform: "twitch",
        livestreams: {
            getActive: twitchGetActive,
            getScheduled: twitchGetScheduled,
        },
    } as unknown as TwitchClient

    const mockKick = {
        platform: "kick",
        livestreams: {
            getActive: kickGetActive,
        },
    } as unknown as KickClient

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("getActive", () => {
        it("routes single getActive request to YouTube provider", async () => {
            const client = createMultiPlatformClient({ youtube: mockYoutube })
            youtubeGetActive.mockResolvedValue([{ streamId: "yt-1" }])

            const result = await client.livestreams.getActive({
                platform: "youtube",
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
            })

            expect(youtubeGetActive).toHaveBeenCalledWith({
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                includeRaw: undefined,
            })
            expect(result).toEqual([{ streamId: "yt-1" }])
        })

        it("routes single getActive request to Twitch provider", async () => {
            const client = createMultiPlatformClient({ twitch: mockTwitch })
            twitchGetActive.mockResolvedValue([{ streamId: "twitch-1" }])

            const result = await client.livestreams.getActive({
                platform: "twitch",
                channelId: "123456",
            })

            expect(twitchGetActive).toHaveBeenCalledWith({
                channelId: "123456",
                includeRaw: undefined,
            })
            expect(result).toEqual([{ streamId: "twitch-1" }])
        })

        it("routes single getActive request to Kick provider", async () => {
            const client = createMultiPlatformClient({ kick: mockKick })
            kickGetActive.mockResolvedValue([{ streamId: "kick-1" }])

            const result = await client.livestreams.getActive({
                platform: "kick",
                channelId: "aksuharun",
            })

            expect(kickGetActive).toHaveBeenCalledWith({
                channelId: "aksuharun",
                includeRaw: undefined,
            })
            expect(result).toEqual([{ streamId: "kick-1" }])
        })

        it("routes batch getActive requests to multiple providers", async () => {
            const client = createMultiPlatformClient({
                youtube: mockYoutube,
                twitch: mockTwitch,
            })
            youtubeGetActive.mockResolvedValue([{ streamId: "yt-1" }])
            twitchGetActive.mockResolvedValue([{ streamId: "twitch-1" }])

            const result = await client.livestreams.getActive([
                { platform: "youtube", channelId: "UCGy9vOmYGW7quWUxJMQbvUg" },
                { platform: "twitch", channelId: "123456" },
            ])

            expect(youtubeGetActive).toHaveBeenCalledWith({ channelId: "UCGy9vOmYGW7quWUxJMQbvUg", includeRaw: undefined })
            expect(twitchGetActive).toHaveBeenCalledWith({ channelId: "123456", includeRaw: undefined })
            expect(result).toEqual([
                [{ streamId: "yt-1" }],
                [{ streamId: "twitch-1" }],
            ])
        })

        it("throws PlatformValidationError when provider is not configured", () => {
            const client = createMultiPlatformClient({})

            expect(() =>
                client.livestreams.getActive({
                    platform: "youtube",
                    channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                }),
            ).toThrow(PlatformValidationError)
        })
    })

    describe("getScheduled", () => {
        it("routes single getScheduled request to YouTube provider", async () => {
            const client = createMultiPlatformClient({ youtube: mockYoutube })
            youtubeGetScheduled.mockResolvedValue([{ streamId: "yt-sched" }])

            const result = await client.livestreams.getScheduled({
                platform: "youtube",
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
            })

            expect(youtubeGetScheduled).toHaveBeenCalledWith({
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                includeRaw: undefined,
            })
            expect(result).toEqual([{ streamId: "yt-sched" }])
        })

        it("throws PlatformValidationError when getScheduled is requested for Kick", () => {
            const client = createMultiPlatformClient({ kick: mockKick })

            expect(() =>
                client.livestreams.getScheduled({
                    platform: "kick",
                    channelId: "aksuharun",
                }),
            ).toThrow(PlatformValidationError)
        })
    })
})
