import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createTwitchChannelsClient } from "../../src/providers/twitch/channels.js"

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
            accessToken: "twitch-user-token",
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
            accessToken: "twitch-user-token",
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
            accessToken: "twitch-user-token",
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
})
