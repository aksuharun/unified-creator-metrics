import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createTwitchPollsClient } from "../../src/providers/twitch/polls.js"

describe("createTwitchPollsClient()", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("creates a Twitch poll with channel points voting", async () => {
        const fetchMock = vi.mocked(fetch)
        const apiPayload = twitchPollPayload({ status: "ACTIVE" })
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["channel:manage:polls"],
            userId: "123",
        }))
        fetchMock.mockResolvedValueOnce(jsonResponse(apiPayload))
        const polls = createTwitchPollsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        const result = await polls.create({
            broadcasterId: "123",
            question: "Heads or tails?",
            choices: ["Heads", "Tails"],
            durationSeconds: 120,
            channelPointsPerVote: 100,
            includeRaw: true,
        })

        const [apiUrl, apiInit] = fetchMock.mock.calls[1]
        expect(String(apiUrl)).toBe("https://api.twitch.tv/helix/polls")
        expect(apiInit).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer twitch-user-token",
                "Client-Id": "twitch-client-id",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(apiInit?.body))).toEqual({
            broadcaster_id: "123",
            title: "Heads or tails?",
            choices: [{ title: "Heads" }, { title: "Tails" }],
            duration: 120,
            channel_points_voting_enabled: true,
            channel_points_per_vote: 100,
        })
        expect(result).toEqual({
            platform: "twitch",
            pollId: "poll-1",
            question: "Heads or tails?",
            choices: [
                { id: "choice-1", text: "Heads", votes: 4 },
                { id: "choice-2", text: "Tails", votes: 7 },
            ],
            status: "active",
            endReason: null,
            durationSeconds: 120,
            createdAt: "2026-05-21T10:30:00.000Z",
            endedAt: null,
            raw: apiPayload,
        })
    })

    it("ends a Twitch poll and archives it when requested", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["channel:manage:polls"],
            userId: "123",
        }))
        fetchMock.mockResolvedValueOnce(jsonResponse(twitchPollPayload({
            status: "ARCHIVED",
            endedAt: "2026-05-21T10:32:00Z",
        })))
        const polls = createTwitchPollsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        const result = await polls.end({
            broadcasterId: "123",
            pollId: "poll-1",
            archive: true,
        })

        const [, apiInit] = fetchMock.mock.calls[1]
        expect(apiInit).toMatchObject({ method: "PATCH" })
        expect(JSON.parse(String(apiInit?.body))).toEqual({
            broadcaster_id: "123",
            id: "poll-1",
            status: "ARCHIVED",
        })
        expect(result).toMatchObject({
            platform: "twitch",
            pollId: "poll-1",
            status: "ended",
            endReason: "archived",
            endedAt: "2026-05-21T10:32:00.000Z",
        })
    })

    it("rejects missing Twitch poll scope before calling the API", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(validatedTokenResponse({
            scopes: ["user:read:chat"],
            userId: "123",
        }))
        const polls = createTwitchPollsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            polls.create({
                broadcasterId: "123",
                question: "Heads or tails?",
                choices: ["Heads", "Tails"],
                durationSeconds: 120,
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("rejects invalid Twitch poll duration before token validation", async () => {
        const fetchMock = vi.mocked(fetch)
        const polls = createTwitchPollsClient({
            clientId: "twitch-client-id",
            userAccessToken: "twitch-user-token",
        })

        await expect(
            polls.create({
                broadcasterId: "123",
                question: "Heads or tails?",
                choices: ["Heads", "Tails"],
                durationSeconds: 14,
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })
})

function validatedTokenResponse(options: {
    scopes: string[]
    userId: string
}): Response {
    return jsonResponse({
        client_id: "twitch-client-id",
        user_id: options.userId,
        scopes: options.scopes,
    })
}

function twitchPollPayload(options: {
    status: string
    endedAt?: string
}): Record<string, unknown> {
    return {
        data: [
            {
                id: "poll-1",
                title: "Heads or tails?",
                choices: [
                    { id: "choice-1", title: "Heads", votes: 4 },
                    { id: "choice-2", title: "Tails", votes: 7 },
                ],
                status: options.status,
                duration: 120,
                started_at: "2026-05-21T10:30:00Z",
                ended_at: options.endedAt ?? null,
            },
        ],
    }
}

function jsonResponse(payload: unknown): Response {
    return new Response(JSON.stringify(payload), { status: 200 })
}
