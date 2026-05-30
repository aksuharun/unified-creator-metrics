import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type { TwitchClient } from "../../src/providers/twitch/types.js"
import type { YoutubeClient } from "../../src/providers/youtube/types.js"

describe("createMultiPlatformClient().polls", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("routes YouTube poll creation to the YouTube provider", async () => {
        const create = vi.fn().mockResolvedValue({
            platform: "youtube",
            pollId: "youtube-poll-1",
            question: "Next topic?",
            choices: [],
            status: "active",
            endReason: null,
            durationSeconds: null,
            createdAt: "2026-05-21T10:30:00.000Z",
            endedAt: null,
        })
        const youtube = {
            platform: "youtube",
            polls: { create },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })

        const result = await client.polls.create({
            platform: "youtube",
            liveChatId: "live-chat-1",
            question: "Next topic?",
            choices: ["APIs", "SDKs"],
            includeRaw: true,
        })

        expect(create).toHaveBeenCalledWith({
            liveChatId: "live-chat-1",
            question: "Next topic?",
            choices: ["APIs", "SDKs"],
            includeRaw: true,
        })
        expect(result).toMatchObject({
            platform: "youtube",
            pollId: "youtube-poll-1",
        })
    })

    it("routes Twitch poll creation to the Twitch provider", async () => {
        const create = vi.fn().mockResolvedValue({
            platform: "twitch",
            pollId: "twitch-poll-1",
            question: "Heads or tails?",
            choices: [],
            status: "active",
            endReason: null,
            durationSeconds: 120,
            createdAt: "2026-05-21T10:30:00.000Z",
            endedAt: null,
        })
        const twitch = {
            platform: "twitch",
            polls: { create },
        } as unknown as TwitchClient
        const client = createMultiPlatformClient({ twitch })

        const result = await client.polls.create({
            platform: "twitch",
            broadcasterId: "123",
            question: "Heads or tails?",
            choices: ["Heads", "Tails"],
            durationSeconds: 120,
            channelPointsPerVote: 100,
        })

        expect(create).toHaveBeenCalledWith({
            broadcasterId: "123",
            question: "Heads or tails?",
            choices: ["Heads", "Tails"],
            durationSeconds: 120,
            channelPointsPerVote: 100,
            includeRaw: undefined,
        })
        expect(result).toMatchObject({
            platform: "twitch",
            pollId: "twitch-poll-1",
        })
    })

    it("routes poll ending to the selected provider", async () => {
        const end = vi.fn().mockResolvedValue({
            platform: "twitch",
            pollId: "twitch-poll-1",
            question: "Heads or tails?",
            choices: [],
            status: "ended",
            endReason: "cancelled",
            durationSeconds: 120,
            createdAt: "2026-05-21T10:30:00.000Z",
            endedAt: "2026-05-21T10:31:00.000Z",
        })
        const twitch = {
            platform: "twitch",
            polls: { end },
        } as unknown as TwitchClient
        const client = createMultiPlatformClient({ twitch })

        await client.polls.end({
            platform: "twitch",
            broadcasterId: "123",
            pollId: "twitch-poll-1",
            archive: false,
            includeRaw: true,
        })

        expect(end).toHaveBeenCalledWith({
            broadcasterId: "123",
            pollId: "twitch-poll-1",
            archive: false,
            includeRaw: true,
        })
    })

    it("rejects poll requests when the selected provider is not configured", async () => {
        const client = createMultiPlatformClient({})

        await expect(
            client.polls.create({
                platform: "youtube",
                liveChatId: "live-chat-1",
                question: "Next topic?",
                choices: ["APIs", "SDKs"],
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })
})
