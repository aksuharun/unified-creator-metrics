import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"
import { createYoutubePollsClient } from "../../src/providers/youtube/polls.js"

describe("createYoutubePollsClient()", () => {
    const insert = vi.fn()
    const transition = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("creates a YouTube live chat poll", async () => {
        const responseData = {
            id: "youtube-poll-1",
            snippet: {
                publishedAt: "2026-05-21T10:30:00Z",
                pollDetails: {
                    status: "active",
                    metadata: {
                        questionText: "Next topic?",
                        options: [
                            { optionText: "APIs", tally: "2" },
                            { optionText: "SDKs", tally: "3" },
                        ],
                    },
                },
            },
        }
        insert.mockResolvedValue({ data: responseData })
        const polls = createYoutubePollsClient({
            youtubeApiClient: createYoutubeClientMock(),
        })

        const result = await polls.create({
            liveChatId: "live-chat-1",
            question: "Next topic?",
            choices: ["APIs", "SDKs"],
            includeRaw: true,
        })

        expect(insert).toHaveBeenCalledWith({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    liveChatId: "live-chat-1",
                    type: "pollEvent",
                    pollDetails: {
                        metadata: {
                            questionText: "Next topic?",
                            options: [
                                { optionText: "APIs" },
                                { optionText: "SDKs" },
                            ],
                        },
                    },
                },
            },
        })
        expect(result).toEqual({
            platform: "youtube",
            pollId: "youtube-poll-1",
            question: "Next topic?",
            choices: [
                { id: null, text: "APIs", votes: 2 },
                { id: null, text: "SDKs", votes: 3 },
            ],
            status: "active",
            endReason: null,
            durationSeconds: null,
            createdAt: "2026-05-21T10:30:00.000Z",
            endedAt: null,
            raw: responseData,
        })
    })

    it("ends a YouTube live chat poll", async () => {
        transition.mockResolvedValue({
            data: {
                id: "youtube-poll-1",
                snippet: {
                    pollDetails: {
                        status: "closed",
                        metadata: {
                            questionText: "Next topic?",
                        },
                    },
                },
            },
        })
        const polls = createYoutubePollsClient({
            youtubeApiClient: createYoutubeClientMock(),
        })

        const result = await polls.end({ pollId: "youtube-poll-1" })

        expect(transition).toHaveBeenCalledWith({
            id: "youtube-poll-1",
            status: "closed",
            part: ["snippet"],
        })
        expect(result).toMatchObject({
            platform: "youtube",
            pollId: "youtube-poll-1",
            question: "Next topic?",
            status: "ended",
            endReason: "completed",
        })
        expect(result.endedAt).toEqual(expect.any(String))
    })

    it("rejects unsupported YouTube choice counts before calling the API", async () => {
        const polls = createYoutubePollsClient({
            youtubeApiClient: createYoutubeClientMock(),
        })

        await expect(
            polls.create({
                liveChatId: "live-chat-1",
                question: "Next topic?",
                choices: ["A", "B", "C", "D", "E"],
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(insert).not.toHaveBeenCalled()
    })

    it("wraps Google API failures with platform context", async () => {
        insert.mockRejectedValue({
            response: {
                status: 403,
            },
        })
        const polls = createYoutubePollsClient({
            youtubeApiClient: createYoutubeClientMock(),
        })

        await expect(
            polls.create({
                liveChatId: "live-chat-1",
                question: "Next topic?",
                choices: ["A", "B"],
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "youtube",
            status: 403,
        })
    })

    function createYoutubeClientMock(): GoogleYoutubeClient {
        return {
            liveChatMessages: {
                insert,
                transition,
            },
        } as unknown as GoogleYoutubeClient
    }
})
