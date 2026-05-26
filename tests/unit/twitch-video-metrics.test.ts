import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createTwitchClient } from "../../src/twitch.js"
import { createTwitchVideosClient } from "../../src/providers/twitch/videos.js"

describe("createTwitchVideosClient().getMetrics", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("fetches Twitch concurrent viewers by broadcaster id", async () => {
        const responsePayload = {
            data: [
                {
                    id: "stream-1",
                    user_id: "123456",
                    user_login: "aksuharun",
                    user_name: "AksuHarun",
                    title: "Live coding",
                    viewer_count: 321,
                },
            ],
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const videos = createTwitchVideosClient({
            clientId: "twitch-client-id",
            appAccessToken: "twitch-app-token",
        })
        const result = await videos.getMetrics({
            videoId: "123456",
            metrics: ["concurrentViewers"],
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
        expect(result).toEqual({
            platform: "twitch",
            videoId: "123456",
            title: "Live coding",
            channelId: "123456",
            channelDisplayName: "AksuHarun",
            likes: null,
            views: null,
            concurrentViewers: 321,
            fetchedAt: expect.any(String),
            raw: responsePayload,
        })
    })

    it("returns null concurrent viewers when the broadcaster is offline", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 }),
        )

        const videos = createTwitchVideosClient({
            clientId: "twitch-client-id",
            appAccessToken: "twitch-app-token",
        })
        const result = await videos.getMetrics({
            videoId: "123456",
            metrics: ["concurrentViewers"],
        })

        expect(result).toEqual({
            platform: "twitch",
            videoId: "123456",
            title: null,
            channelId: "123456",
            channelDisplayName: null,
            likes: null,
            views: null,
            concurrentViewers: null,
            fetchedAt: expect.any(String),
        })
    })

    it("rejects unsupported Twitch video metrics", async () => {
        const fetchMock = vi.mocked(fetch)
        const videos = createTwitchVideosClient({
            clientId: "twitch-client-id",
            appAccessToken: "twitch-app-token",
        })

        await expect(
            videos.getMetrics({
                videoId: "123456",
                metrics: ["views"] as unknown as ["concurrentViewers"],
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("wraps Twitch streams API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
            }),
        )
        const videos = createTwitchVideosClient({
            clientId: "twitch-client-id",
            appAccessToken: "twitch-app-token",
        })

        await expect(
            videos.getMetrics({
                videoId: "123456",
                metrics: ["concurrentViewers"],
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "twitch",
            status: 401,
        })
    })

    it("refreshes a stale Twitch user token and retries once", async () => {
        const fetchMock = vi.mocked(fetch)
        const onUserTokenUpdate = vi.fn()
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
            }),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: "fresh-user-token",
                    refresh_token: "fresh-refresh-token",
                    expires_in: 3600,
                    scope: ["user:read:chat"],
                    token_type: "bearer",
                }),
                { status: 200 },
            ),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "stream-1",
                            user_id: "123456",
                            user_name: "AksuHarun",
                            title: "Live coding",
                            viewer_count: 88,
                        },
                    ],
                }),
                { status: 200 },
            ),
        )

        const twitch = createTwitchClient({
            clientId: "twitch-client-id",
            clientSecret: "twitch-client-secret",
            userAccessToken: "stale-user-token",
            userRefreshToken: "stale-refresh-token",
            onUserTokenUpdate,
        })
        const result = await twitch.videos.getMetrics({
            videoId: "123456",
            metrics: ["concurrentViewers"],
        })

        const firstApiCall = fetchMock.mock.calls[0]
        expect(String(firstApiCall[0])).toBe(
            "https://api.twitch.tv/helix/streams?user_id=123456",
        )
        expect(firstApiCall[1]).toMatchObject({
            headers: {
                Authorization: "Bearer stale-user-token",
                "Client-Id": "twitch-client-id",
            },
        })

        const tokenRefreshCall = fetchMock.mock.calls[1]
        expect(String(tokenRefreshCall[0])).toBe(
            "https://id.twitch.tv/oauth2/token",
        )

        const secondApiCall = fetchMock.mock.calls[2]
        expect(String(secondApiCall[0])).toBe(
            "https://api.twitch.tv/helix/streams?user_id=123456",
        )
        expect(secondApiCall[1]).toMatchObject({
            headers: {
                Authorization: "Bearer fresh-user-token",
                "Client-Id": "twitch-client-id",
            },
        })
        expect(onUserTokenUpdate).toHaveBeenCalledWith({
            accessToken: "fresh-user-token",
            refreshToken: "fresh-refresh-token",
            expiresIn: 3600,
            expiresAt: expect.any(String),
            scope: ["user:read:chat"],
            tokenType: "bearer",
        })
        expect(result.concurrentViewers).toBe(88)
    })
})
