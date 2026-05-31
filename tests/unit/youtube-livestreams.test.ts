import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createYoutubeLivestreamsClient } from "../../src/providers/youtube/livestreams.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"

describe("createYoutubeLivestreamsClient", () => {
    const searchList = vi.fn()
    const liveBroadcastsList = vi.fn()

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
            searchList.mockResolvedValue({
                data: responseData,
            })

            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: {
                        list: searchList,
                    },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: false,
            })

            const result = await client.getActive({
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                includeRaw: true,
            })

            expect(searchList).toHaveBeenCalledWith({
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
                    search: { list: searchList },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: false,
            })

            await expect(
                client.getActive({
                    channelId: "   ",
                }),
            ).rejects.toBeInstanceOf(PlatformValidationError)
            expect(searchList).not.toHaveBeenCalled()
        })

        it("wraps Google API failures with platform context", async () => {
            searchList.mockRejectedValue({
                response: {
                    status: 403,
                },
            })
            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: { list: searchList },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: false,
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
            searchList.mockResolvedValue({
                data: responseData,
            })

            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    search: {
                        list: searchList,
                    },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: false,
            })

            const result = await client.getScheduled({
                channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                includeRaw: true,
            })

            expect(searchList).toHaveBeenCalledWith({
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
                    search: { list: searchList },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: false,
            })

            await expect(
                client.getScheduled({
                    channelId: "",
                }),
            ).rejects.toBeInstanceOf(PlatformValidationError)
            expect(searchList).not.toHaveBeenCalled()
        })
    })

    describe("getAuthenticatedChannelActive", () => {
        it("fetches active streams for the authenticated YouTube channel", async () => {
            const responseData = {
                items: [
                    {
                        id: "youtube-stream-1",
                        snippet: {
                            title: "Live broadcast title",
                            channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                            actualStartTime: "2026-05-21T10:30:00Z",
                        },
                        status: {
                            lifeCycleStatus: "live",
                        },
                    },
                ],
            }
            liveBroadcastsList.mockResolvedValue({
                data: responseData,
            })

            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    liveBroadcasts: {
                        list: liveBroadcastsList,
                    },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: true,
            })

            const result = await client.getAuthenticatedChannelActive({
                includeRaw: true,
            })

            expect(liveBroadcastsList).toHaveBeenCalledWith({
                part: ["id", "snippet", "status"],
                broadcastStatus: "active",
                broadcastType: "all",
                fields:
                    "items(id,snippet(channelId,title,publishedAt,scheduledStartTime,actualStartTime),status(lifeCycleStatus))",
            })
            expect(result).toEqual([
                {
                    platform: "youtube",
                    streamId: "youtube-stream-1",
                    title: "Live broadcast title",
                    channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                    channelDisplayName: null,
                    status: "live",
                    concurrentViewers: null,
                    startedAt: "2026-05-21T10:30:00Z",
                    fetchedAt: expect.any(String),
                    raw: responseData.items[0],
                },
            ])
        })

        it("rejects the authenticated-channel lookup when no authenticated YouTube access is configured", async () => {
            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    liveBroadcasts: { list: liveBroadcastsList },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: false,
            })

            await expect(
                client.getAuthenticatedChannelActive(),
            ).rejects.toBeInstanceOf(PlatformValidationError)
            expect(liveBroadcastsList).not.toHaveBeenCalled()
        })
    })

    describe("getAuthenticatedChannelScheduled", () => {
        it("fetches scheduled streams for the authenticated YouTube channel", async () => {
            const responseData = {
                items: [
                    {
                        id: "youtube-scheduled-1",
                        snippet: {
                            title: "Upcoming broadcast title",
                            channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                            scheduledStartTime: "2026-05-22T14:00:00Z",
                        },
                        status: {
                            lifeCycleStatus: "ready",
                        },
                    },
                ],
            }
            liveBroadcastsList.mockResolvedValue({
                data: responseData,
            })

            const client = createYoutubeLivestreamsClient({
                youtubeApiClient: {
                    liveBroadcasts: {
                        list: liveBroadcastsList,
                    },
                } as unknown as GoogleYoutubeClient,
                hasAuthenticatedAccess: true,
            })

            const result = await client.getAuthenticatedChannelScheduled()

            expect(liveBroadcastsList).toHaveBeenCalledWith({
                part: ["id", "snippet", "status"],
                broadcastStatus: "upcoming",
                broadcastType: "all",
                fields:
                    "items(id,snippet(channelId,title,publishedAt,scheduledStartTime,actualStartTime),status(lifeCycleStatus))",
            })
            expect(result).toEqual([
                {
                    platform: "youtube",
                    streamId: "youtube-scheduled-1",
                    title: "Upcoming broadcast title",
                    channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
                    channelDisplayName: null,
                    status: "upcoming",
                    concurrentViewers: null,
                    startedAt: "2026-05-22T14:00:00Z",
                    fetchedAt: expect.any(String),
                },
            ])
        })
    })
})
