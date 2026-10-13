import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createTwitchChannelsClient } from "../../src/providers/twitch/channels.js"
import { createTwitchClient } from "../../src/twitch.js"

describe("createTwitchChannelsClient().getMetrics", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("fetches Twitch follower count by broadcaster id", async () => {
        const responsePayload = {
            total: 42,
            data: [],
            pagination: {},
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const channels = createTwitchChannelsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })
        const result = await channels.getMetrics({
            channelId: "123456",
            metrics: ["followers"],
            includeRaw: true,
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe(
            "https://api.twitch.tv/helix/channels/followers?broadcaster_id=123456",
        )
        expect(init).toMatchObject({
            headers: {
                Authorization: "Bearer twitch-user-token",
                "Client-Id": "twitch-client-id",
            },
        })
        expect(result).toEqual({
            platform: "twitch",
            channelId: "123456",
            displayName: null,
            followers: 42,
            views: null,
            fetchedAt: expect.any(String),
            raw: responsePayload,
        })
    })

    it("rejects unsupported Twitch channel metrics", async () => {
        const fetchMock = vi.mocked(fetch)
        const channels = createTwitchChannelsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            channels.getMetrics({
                channelId: "123456",
                metrics: ["views"] as unknown as ["followers"],
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("wraps Twitch follower API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
            }),
        )
        const channels = createTwitchChannelsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            channels.getMetrics({
                channelId: "123456",
                metrics: ["followers"],
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
            new Response(JSON.stringify({ total: 77 }), { status: 200 }),
        )

        const twitch = createTwitchClient({
            clientId: "twitch-client-id",
            clientSecret: "twitch-client-secret",
            userAccessToken: "stale-user-token",
            userRefreshToken: "stale-refresh-token",
            onUserTokenUpdate,
        })
        const result = await twitch.channels.getMetrics({
            channelId: "123456",
            metrics: ["followers"],
        })

        const firstApiCall = fetchMock.mock.calls[0]
        expect(String(firstApiCall[0])).toBe(
            "https://api.twitch.tv/helix/channels/followers?broadcaster_id=123456",
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
        expect(tokenRefreshCall[1]).toMatchObject({
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        const tokenRefreshBody = new URLSearchParams(
            String(tokenRefreshCall[1]?.body),
        )
        expect(tokenRefreshBody.get("client_id")).toBe("twitch-client-id")
        expect(tokenRefreshBody.get("client_secret")).toBe("twitch-client-secret")
        expect(tokenRefreshBody.get("grant_type")).toBe("refresh_token")
        expect(tokenRefreshBody.get("refresh_token")).toBe("stale-refresh-token")

        const secondApiCall = fetchMock.mock.calls[2]
        expect(String(secondApiCall[0])).toBe(
            "https://api.twitch.tv/helix/channels/followers?broadcaster_id=123456",
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
        expect(result.followers).toBe(77)
    })
})
