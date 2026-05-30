import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { YOUTUBE_PLATFORM } from "./constants.js"
import type { GoogleYoutubeClient } from "./google-client.js"
import type {
    YoutubeCreatePollRequest,
    YoutubeCreatePollResult,
    YoutubeEndPollRequest,
    YoutubeEndPollResult,
    YoutubePollsClient,
} from "./types.js"
import type { PollEndReason, PollStatus } from "../../types.js"

type YoutubePollsClientOptions = {
    youtubeApiClient: GoogleYoutubeClient
}

type YoutubePollTransitionRequest = {
    id: string
    status: "closed"
    part: string[]
}

type YoutubePollOption = {
    optionText?: string | null
    tally?: string | number | null
}

type YoutubePollMessage = {
    id?: string | null
    snippet?: {
        publishedAt?: string | null
        pollDetails?: {
            metadata?: {
                questionText?: string | null
                status?: string | null
                options?: YoutubePollOption[] | YoutubePollOption | null
            } | null
        } | null
    } | null
}

/**
 * Create the YouTube polls capability object exposed as `youtube.polls`.
 */
export function createYoutubePollsClient(
    options: YoutubePollsClientOptions,
): YoutubePollsClient {
    return {
        async create(
            request: YoutubeCreatePollRequest,
        ): Promise<YoutubeCreatePollResult> {
            validateYoutubeCreatePollRequest(request)

            try {
                const response =
                    await options.youtubeApiClient.liveChatMessages.insert({
                        part: ["snippet"],
                        requestBody: {
                            snippet: {
                                liveChatId: request.liveChatId,
                                type: "pollEvent",
                                pollDetails: {
                                    metadata: {
                                        questionText: request.question,
                                        options: request.choices.map((choice) => ({
                                            optionText: choice,
                                        })),
                                    },
                                },
                            },
                        },
                    })

                return normalizeYoutubePollMessage(
                    response.data as YoutubePollMessage,
                    {
                        raw: request.includeRaw ? response.data : undefined,
                    },
                )
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
        async end(request: YoutubeEndPollRequest): Promise<YoutubeEndPollResult> {
            validateYoutubeEndPollRequest(request)

            try {
                const endedAt = new Date().toISOString()
                const transitionRequest: YoutubePollTransitionRequest = {
                    id: request.pollId,
                    status: "closed",
                    part: ["snippet"],
                }
                const response =
                    await options.youtubeApiClient.liveChatMessages.transition(
                        transitionRequest,
                    )

                return normalizeYoutubePollMessage(
                    response.data as YoutubePollMessage,
                    {
                        raw: request.includeRaw ? response.data : undefined,
                        endedAt,
                    },
                )
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
    }
}

function validateYoutubeCreatePollRequest(
    request: YoutubeCreatePollRequest,
): asserts request is YoutubeCreatePollRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "YouTube create poll request is required.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (!request.liveChatId || typeof request.liveChatId !== "string") {
        throw new PlatformValidationError(
            "liveChatId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    validatePollQuestion(request.question)
    validatePollChoices(request.choices)
}

function validateYoutubeEndPollRequest(
    request: YoutubeEndPollRequest,
): asserts request is YoutubeEndPollRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "YouTube end poll request is required.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (!request.pollId || typeof request.pollId !== "string") {
        throw new PlatformValidationError(
            "pollId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

function validatePollQuestion(question: unknown): void {
    if (
        typeof question !== "string" ||
        question.trim().length === 0
    ) {
        throw new PlatformValidationError(
            "Poll question is required and must be a non-empty string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

function validatePollChoices(choices: unknown): void {
    if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) {
        throw new PlatformValidationError(
            "YouTube polls require at least 2 choices and at most 4 choices.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    for (const choice of choices) {
        if (typeof choice !== "string" || choice.trim().length === 0) {
            throw new PlatformValidationError(
                "Poll choices must be non-empty strings.",
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }
}

function normalizeYoutubePollMessage(
    message: YoutubePollMessage,
    options: {
        raw?: unknown
        endedAt?: string
    },
): YoutubeCreatePollResult {
    const metadata = message.snippet?.pollDetails?.metadata
    const pollId = message.id
    const status = normalizeYoutubePollStatus(metadata?.status)

    if (!pollId) {
        throw new PlatformApiError(
            "YouTube poll response did not include an id.",
            { platform: YOUTUBE_PLATFORM, cause: message },
        )
    }

    return {
        platform: YOUTUBE_PLATFORM,
        pollId,
        question: metadata?.questionText ?? null,
        choices: normalizeYoutubePollOptions(metadata?.options),
        status,
        endReason: normalizeYoutubePollEndReason(metadata?.status),
        durationSeconds: null,
        createdAt: normalizeNullableDate(
            message.snippet?.publishedAt ?? undefined,
        ),
        endedAt: status === "ended" ? options.endedAt ?? null : null,
        ...(options.raw === undefined ? {} : { raw: options.raw }),
    }
}

function normalizeYoutubePollOptions(
    options: YoutubePollOption[] | YoutubePollOption | null | undefined,
): YoutubeCreatePollResult["choices"] {
    const normalizedOptions = Array.isArray(options)
        ? options
        : options
            ? [options]
            : []

    return normalizedOptions.map((option) => ({
        id: null,
        text: option.optionText ?? "",
        votes: normalizeNullableInteger(option.tally),
    }))
}

function normalizeYoutubePollStatus(status: string | null | undefined): PollStatus {
    if (status === "active") {
        return "active"
    }

    if (status === "closed") {
        return "ended"
    }

    if (status === "unknown") {
        return status
    }

    return "unknown"
}

function normalizeYoutubePollEndReason(
    status: string | null | undefined,
): PollEndReason | null {
    if (status === "active") {
        return null
    }

    if (status === "closed") {
        return "completed"
    }

    if (status === "unknown") {
        return "unknown"
    }

    return null
}

function normalizeNullableInteger(
    value: string | number | null | undefined,
): number | null {
    if (typeof value === "number") {
        return Number.isInteger(value) ? value : null
    }

    if (typeof value !== "string") {
        return null
    }

    const normalizedValue = Number.parseInt(value, 10)

    return Number.isInteger(normalizedValue) ? normalizedValue : null
}

function normalizeNullableDate(value: string | undefined): string | null {
    const timestamp = value ? Date.parse(value) : Number.NaN

    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

/**
 * Best-effort extraction of an HTTP status code from Google API client errors.
 */
function getGoogleApiErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object" || !("response" in error)) {
        return undefined
    }

    const response = error.response

    if (!response || typeof response !== "object" || !("status" in response)) {
        return undefined
    }

    const status = Number(response.status)

    return Number.isNaN(status) ? undefined : status
}
