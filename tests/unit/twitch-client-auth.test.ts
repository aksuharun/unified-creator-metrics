import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createTwitchClient } from "../../src/providers/twitch/index.js"

describe("createTwitchClient auth requirements", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("requires userAccessToken for chat.listen()", () => {
        const twitch = createTwitchClient({
            clientId: "twitch-client-id",
            appAccessToken: "twitch-app-token",
        })

        expect(() =>
            twitch.chat.listen({
                broadcasterId: "broadcaster-1",
            }),
        ).toThrow(PlatformValidationError)
    })

    it("requires userAccessToken for channels.getMetrics()", async () => {
        const twitch = createTwitchClient({
            clientId: "twitch-client-id",
            appAccessToken: "twitch-app-token",
        })

        await expect(
            twitch.channels.getMetrics({
                channelId: "broadcaster-1",
                metrics: ["followers"],
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })

    it("accepts the deprecated accessToken as a fallback", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "broadcaster-1",
                            login: "aksuharun",
                            display_name: "AksuHarun",
                        },
                    ],
                }),
                { status: 200 },
            ),
        )

        const twitch = createTwitchClient({
            clientId: "twitch-client-id",
            accessToken: "legacy-twitch-token",
        })

        await twitch.channels.resolve({
            login: "aksuharun",
        })

        const [, init] = fetchMock.mock.calls[0]
        expect(init).toMatchObject({
            headers: {
                Authorization: "Bearer legacy-twitch-token",
                "Client-Id": "twitch-client-id",
            },
        })
    })
})
