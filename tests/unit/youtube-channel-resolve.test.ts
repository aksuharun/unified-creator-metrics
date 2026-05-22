import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createYoutubeChannelsClient } from "../../src/providers/youtube/channels.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"

describe("createYoutubeChannelsClient().resolve", () => {
    const list = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("resolves a YouTube channel id from a handle", async () => {
        const responseData = {
            items: [
                {
                    id: "UCGy9vOmYGW7quWUxJMQbvUg",
                    snippet: {
                        title: "Aksu Harun",
                    },
                },
            ],
        }
        list.mockResolvedValue({
            data: responseData,
            status: 200,
        })

        const channels = createYoutubeChannelsClient({
            youtubeApiClient: {
                channels: {
                    list,
                },
            } as unknown as GoogleYoutubeClient,
        })

        const result = await channels.resolve({
            handle: "aksuharun",
            includeRaw: true,
        })

        expect(list).toHaveBeenCalledWith({
            part: ["id", "snippet"],
            forHandle: "@aksuharun",
            maxResults: 1,
            fields: "items(id,snippet(title))",
        })
        expect(result).toEqual({
            platform: "youtube",
            channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
            handle: "@aksuharun",
            displayName: "Aksu Harun",
            fetchedAt: expect.any(String),
            raw: responseData,
        })
    })

    it("rejects blank handles before calling the API", async () => {
        const channels = createYoutubeChannelsClient({
            youtubeApiClient: {
                channels: {
                    list,
                },
            } as unknown as GoogleYoutubeClient,
        })

        await expect(
            channels.resolve({
                handle: "   ",
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
        const channels = createYoutubeChannelsClient({
            youtubeApiClient: {
                channels: {
                    list,
                },
            } as unknown as GoogleYoutubeClient,
        })

        await expect(
            channels.resolve({
                handle: "@aksuharun",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "youtube",
            status: 403,
        })
    })
})
