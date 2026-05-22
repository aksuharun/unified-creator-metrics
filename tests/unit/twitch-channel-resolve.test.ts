import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createTwitchChannelsClient } from "../../src/providers/twitch/channels.js"

describe("createTwitchChannelsClient().resolve", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("resolves a Twitch broadcaster id from a login", async () => {
        const responsePayload = {
            data: [
                {
                    id: "123456",
                    login: "aksuharun",
                    display_name: "AksuHarun",
                },
            ],
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const channels = createTwitchChannelsClient({
            clientId: "twitch-client-id",
            accessToken: "twitch-token",
        })
        const result = await channels.resolve({
            login: "AksuHarun",
            includeRaw: true,
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe("https://api.twitch.tv/helix/users?login=aksuharun")
        expect(init).toMatchObject({
            headers: {
                Authorization: "Bearer twitch-token",
                "Client-Id": "twitch-client-id",
            },
        })
        expect(result).toEqual({
            platform: "twitch",
            broadcasterId: "123456",
            login: "aksuharun",
            displayName: "AksuHarun",
            fetchedAt: expect.any(String),
            raw: responsePayload,
        })
    })

    it("rejects blank logins before calling the API", async () => {
        const fetchMock = vi.mocked(fetch)
        const channels = createTwitchChannelsClient({
            clientId: "twitch-client-id",
            accessToken: "twitch-token",
        })

        await expect(
            channels.resolve({
                login: "   ",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("wraps Twitch API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
        )
        const channels = createTwitchChannelsClient({
            clientId: "twitch-client-id",
            accessToken: "twitch-token",
        })

        await expect(
            channels.resolve({
                login: "aksuharun",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "twitch",
            status: 403,
        })
    })
})
