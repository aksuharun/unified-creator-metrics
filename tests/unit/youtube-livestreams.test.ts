import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createYoutubeLivestreamsClient } from "../../src/providers/youtube/livestreams.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"

describe("createYoutubeLivestreamsClient", () => {
    const list = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("getActive", () => {
        it("fetches active streams for a channel", async () => {
            const publishedAt = "2026-05-21T10:30:00Z"
            const responseData = {
                items: [
                    {
                        id: { videoId: "youtube-stream-1" },
                        snippet: {
                            title: "Live broadcast title",
                            channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                            channelTitle: "Google DeepMind",
                            liveBroadcastContent: "live",
                            publishedAt,
                        },
                    },
                ],
            }
            list.mockResolvedValue({
                data: responseData,
            })

            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: {
                        list,
                    },
                } as unknown as GoogleYoutubeClient,
            })

            const result = await client.getActive({
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                includeRaw: true,
            })

            expect(list).toHaveBeenCalledWith({
                part: ["snippet"],
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                type: ["video"],
                eventType: "live",
            })
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                platform: "youtube",
                streamId: "youtube-stream-1",
                title: "Live broadcast title",
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                channelDisplayName: "Google DeepMind",
                status: "live",
                concurrentViewers: null,
                startedAt: publishedAt,
                fetchedAt: expect.any(String),
                raw: responseData.items[0],
            })
        })

        it("rejects blank channelId", async () => {
            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: { list },
                } as unknown as GoogleYoutubeClient,
            })

            await expect(
                client.getActive({
                    channelId: "   ",
                }),
            ).rejects.toBeInstanceOf(PlatformValidationError)
            expect(list).not.toHaveBeenCalled()
        })

        it("wraps Google API failures with platform context", async () => {
            list.mockRejectedValue({
                response: {
                    status: 403,
                },
            })
            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: { list },
                } as unknown as GoogleYoutubeClient,
            })

            await expect(
                client.getActive({
                    channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                }),
            ).rejects.toMatchObject<Partial<PlatformApiError>>({
                name: "PlatformApiError",
                platform: "youtube",
                status: 403,
            })
        })
    })

    describe("getScheduled", () => {
        it("fetches scheduled streams for a channel", async () => {
            const publishedAt = "2026-05-22T14:00:00Z"
            const responseData = {
                items: [
                    {
                        id: { videoId: "youtube-scheduled-1" },
                        snippet: {
                            title: "Upcoming broadcast title",
                            channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                            channelTitle: "Google DeepMind",
                            liveBroadcastContent: "upcoming",
                            publishedAt,
                        },
                    },
                ],
            }
            list.mockResolvedValue({
                data: responseData,
            })

            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: {
                        list,
                    },
                } as unknown as GoogleYoutubeClient,
            })

            const result = await client.getScheduled({
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                includeRaw: true,
            })

            expect(list).toHaveBeenCalledWith({
                part: ["snippet"],
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                type: ["video"],
                eventType: "upcoming",
            })
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                platform: "youtube",
                streamId: "youtube-scheduled-1",
                title: "Upcoming broadcast title",
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                channelDisplayName: "Google DeepMind",
                status: "upcoming",
                concurrentViewers: null,
                startedAt: publishedAt,
                fetchedAt: expect.any(String),
                raw: responseData.items[0],
            })
        })

        it("rejects blank channelId", async () => {
            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: { list },
                } as unknown as GoogleYoutubeClient,
            })

            await expect(
                client.getScheduled({
                    channelId: "",
                }),
            ).rejects.toBeInstanceOf(PlatformValidationError)
            expect(list).not.toHaveBeenCalled()
        })
    })
})
