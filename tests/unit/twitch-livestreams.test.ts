import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createTwitchLivestreamsClient } from "../../src/providers/twitch/livestreams.js"

describe("createTwitchLivestreamsClient", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    describe("getActive", () => {
        it("fetches active Twitch streams by channel id", async () => {
            const responsePayload = {
                data: [
                    {
                        id: "stream-123",
                        user_id: "123456",
                        user_login: "twitchdev",
                        user_name: "TwitchDev",
                        title: "Twitch API Live",
                        viewer_count: 50,
                        started_at: "2026-05-21T12:00:00Z",
                    },
                ],
            }
            const fetchMock = vi.mocked(fetch)
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify(responsePayload), { status: 200 }),
            )

            const client = createTwitchLivestreamsClient({
                clientId: "twitch-client-id",
                appAccessToken: "twitch-app-token",
            })
            const result = await client.getActive({
                channelId: "123456",
                includeRaw: true,
            })

            expect(fetchMock).toHaveBeenCalledTimes(1)
            const [url, init] = fetchMock.mock.calls[0]
            expect(String(url)).toBe(
                "https://api.twitch.tv/helix/streams?user_id=123456",
            )
            expect(init).toMatchObject({
                headers: {
                    Authorization: "Bearer twitch-app-token",
                    "Client-Id": "twitch-client-id",
                },
            })
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                platform: "twitch",
                streamId: "stream-123",
                title: "Twitch API Live",
                channelId: "123456",
                channelDisplayName: "TwitchDev",
                status: "live",
                concurrentViewers: 50,
                startedAt: "2026-05-21T12:00:00Z",
                fetchedAt: expect.any(String),
                raw: responsePayload.data[0],
            })
        })

        it("returns empty array if the broadcaster is offline", async () => {
            const fetchMock = vi.mocked(fetch)
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ data: [] }), { status: 200 }),
            )

            const client = createTwitchLivestreamsClient({
                clientId: "twitch-client-id",
                appAccessToken: "twitch-app-token",
            })
            const result = await client.getActive({
                channelId: "123456",
            })

            expect(result).toEqual([])
        })

        it("rejects blank channelId", async () => {
            const client = createTwitchLivestreamsClient({
                clientId: "twitch-client-id",
                appAccessToken: "twitch-app-token",
            })

            await expect(
                client.getActive({
                    channelId: "",
                }),
            ).rejects.toBeInstanceOf(PlatformValidationError)
        })
    })

    describe("getScheduled", () => {
        it("fetches Twitch scheduled streams by broadcaster id", async () => {
            const responsePayload = {
                data: {
                    broadcaster_id: "123456",
                    broadcaster_name: "TwitchDev",
                    broadcaster_login: "twitchdev",
                    segments: [
                        {
                            id: "segment-1",
                            start_time: "2026-05-22T14:00:00Z",
                            end_time: "2026-05-22T16:00:00Z",
                            title: "Upcoming Segment 1",
                            canceled_until: null,
                            category: null,
                            is_recurring: false,
                        },
                    ],
                },
            }
            const fetchMock = vi.mocked(fetch)
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify(responsePayload), { status: 200 }),
            )

            const client = createTwitchLivestreamsClient({
                clientId: "twitch-client-id",
                appAccessToken: "twitch-app-token",
            })
            const result = await client.getScheduled({
                channelId: "123456",
                includeRaw: true,
            })

            expect(fetchMock).toHaveBeenCalledTimes(1)
            const [url, init] = fetchMock.mock.calls[0]
            expect(String(url)).toBe(
                "https://api.twitch.tv/helix/schedule?broadcaster_id=123456",
            )
            expect(init).toMatchObject({
                headers: {
                    Authorization: "Bearer twitch-app-token",
                    "Client-Id": "twitch-client-id",
                },
            })
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                platform: "twitch",
                streamId: "segment-1",
                title: "Upcoming Segment 1",
                channelId: "123456",
                channelDisplayName: "TwitchDev",
                status: "upcoming",
                concurrentViewers: null,
                startedAt: "2026-05-22T14:00:00Z",
                fetchedAt: expect.any(String),
                raw: responsePayload.data.segments[0],
            })
        })

        it("returns empty array if Twitch schedule returns 404", async () => {
            const fetchMock = vi.mocked(fetch)
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ message: "Schedule not found" }), { status: 404 }),
            )

            const client = createTwitchLivestreamsClient({
                clientId: "twitch-client-id",
                appAccessToken: "twitch-app-token",
            })
            const result = await client.getScheduled({
                channelId: "123456",
            })

            expect(result).toEqual([])
        })
    })
})
