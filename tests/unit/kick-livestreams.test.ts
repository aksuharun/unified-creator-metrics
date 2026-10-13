import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createKickLivestreamsClient } from "../../src/providers/kick/livestreams.js"

describe("createKickLivestreamsClient", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    describe("getActive", () => {
        it("fetches active Kick streams by channel slug", async () => {
            const responsePayload = {
                data: [
                    {
                        broadcaster_user_id: 1234,
                        slug: "aksuharun",
                        stream_title: "Kick Coding Session",
                        stream: {
                            is_live: true,
                            viewer_count: 75,
                        },
                    },
                ],
            }
            const fetchMock = vi.mocked(fetch)
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify(responsePayload), { status: 200 }),
            )

            const client = createKickLivestreamsClient({
                appAccessToken: "kick-app-token",
            })
            const result = await client.getActive({
                channelId: "aksuharun",
                includeRaw: true,
            })

            expect(fetchMock).toHaveBeenCalledTimes(1)
            const [url, init] = fetchMock.mock.calls[0]
            expect(String(url)).toBe(
                "https://api.kick.com/public/v1/channels?slug=aksuharun",
            )
            expect(init).toMatchObject({
                headers: {
                    Authorization: "Bearer kick-app-token",
                },
            })
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                platform: "kick",
                streamId: "1234",
                title: "Kick Coding Session",
                channelId: "aksuharun",
                channelDisplayName: "aksuharun",
                status: "live",
                concurrentViewers: 75,
                startedAt: null,
                fetchedAt: expect.any(String),
                raw: responsePayload.data[0],
            })
        })

        it("returns empty array if the channel is offline", async () => {
            const responsePayload = {
                data: [
                    {
                        broadcaster_user_id: 1234,
                        slug: "aksuharun",
                        stream_title: "Kick Coding Session",
                        stream: null,
                    },
                ],
            }
            const fetchMock = vi.mocked(fetch)
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify(responsePayload), { status: 200 }),
            )

            const client = createKickLivestreamsClient({
                appAccessToken: "kick-app-token",
            })
            const result = await client.getActive({
                channelId: "aksuharun",
            })

            expect(result).toEqual([])
        })

        it("rejects blank channelId", async () => {
            const client = createKickLivestreamsClient({
                appAccessToken: "kick-app-token",
            })

            await expect(
                client.getActive({
                    channelId: "",
                }),
            ).rejects.toBeInstanceOf(PlatformValidationError)
        })
    })
})
