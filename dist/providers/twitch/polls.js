import { PlatformApiError, PlatformValidationError } from "../../errors.js";
import { createTwitchUserAccessTokenProvider, } from "./auth.js";
import { TWITCH_PLATFORM } from "./constants.js";
import { requireTwitchUserAccessTokenProvider, twitchRequest, validateTwitchUserAccessToken, } from "./request.js";
const TWITCH_POLLS_SCOPE = "channel:manage:polls";
const TWITCH_POLL_DURATION_MIN_SECONDS = 15;
const TWITCH_POLL_DURATION_MAX_SECONDS = 1800;
const TWITCH_POLL_QUESTION_MAX_LENGTH = 60;
const TWITCH_POLL_CHOICE_MAX_LENGTH = 25;
const TWITCH_CHANNEL_POINTS_PER_VOTE_MAX = 1_000_000;
/**
 * Create the Twitch polls capability object exposed as `twitch.polls`.
 */
export function createTwitchPollsClient(options) {
    const userAccessTokenProvider = options.userAccessTokenProvider ??
        createTwitchUserAccessTokenProvider({
            accessToken: options.userAccessToken,
            clientId: options.clientId,
        });
    return {
        async create(request) {
            validateTwitchCreatePollRequest(request);
            const resolvedUserAccessTokenProvider = requireTwitchUserAccessTokenProvider(userAccessTokenProvider, "polls.create()");
            const validatedToken = await validateTwitchUserAccessToken({
                clientId: options.clientId,
                userAccessTokenProvider: resolvedUserAccessTokenProvider,
            }, {
                feature: "polls.create()",
                requiredScopes: [TWITCH_POLLS_SCOPE],
            });
            validatePollBroadcasterAccess(request.broadcasterId, validatedToken.userId);
            const payload = await twitchRequest({
                clientId: options.clientId,
                userAccessTokenProvider: resolvedUserAccessTokenProvider,
            }, "/polls", {
                method: "POST",
                body: JSON.stringify({
                    broadcaster_id: request.broadcasterId,
                    title: request.question,
                    choices: request.choices.map((choice) => ({
                        title: choice,
                    })),
                    duration: request.durationSeconds,
                    channel_points_voting_enabled: request.channelPointsPerVote !== undefined,
                    ...(request.channelPointsPerVote === undefined
                        ? {}
                        : {
                            channel_points_per_vote: request.channelPointsPerVote,
                        }),
                }),
            });
            return normalizeTwitchPollResponse(payload, request.includeRaw);
        },
        async end(request) {
            validateTwitchEndPollRequest(request);
            const resolvedUserAccessTokenProvider = requireTwitchUserAccessTokenProvider(userAccessTokenProvider, "polls.end()");
            const validatedToken = await validateTwitchUserAccessToken({
                clientId: options.clientId,
                userAccessTokenProvider: resolvedUserAccessTokenProvider,
            }, {
                feature: "polls.end()",
                requiredScopes: [TWITCH_POLLS_SCOPE],
            });
            validatePollBroadcasterAccess(request.broadcasterId, validatedToken.userId);
            const payload = await twitchRequest({
                clientId: options.clientId,
                userAccessTokenProvider: resolvedUserAccessTokenProvider,
            }, "/polls", {
                method: "PATCH",
                body: JSON.stringify({
                    broadcaster_id: request.broadcasterId,
                    id: request.pollId,
                    status: request.archive ? "ARCHIVED" : "TERMINATED",
                }),
            });
            return normalizeTwitchPollResponse(payload, request.includeRaw);
        },
    };
}
function validateTwitchCreatePollRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Twitch create poll request is required.", { platform: TWITCH_PLATFORM });
    }
    validateBroadcasterId(request.broadcasterId);
    if (typeof request.question !== "string" ||
        request.question.trim().length === 0) {
        throw new PlatformValidationError("Poll question is required and must be a non-empty string.", { platform: TWITCH_PLATFORM });
    }
    if (request.question.length > TWITCH_POLL_QUESTION_MAX_LENGTH) {
        throw new PlatformValidationError("Twitch poll question must be 60 characters or fewer.", { platform: TWITCH_PLATFORM });
    }
    if (!Array.isArray(request.choices) || request.choices.length < 2 || request.choices.length > 5) {
        throw new PlatformValidationError("Twitch polls require at least 2 choices and at most 5 choices.", { platform: TWITCH_PLATFORM });
    }
    for (const choice of request.choices) {
        if (typeof choice !== "string" || choice.trim().length === 0) {
            throw new PlatformValidationError("Poll choices must be non-empty strings.", { platform: TWITCH_PLATFORM });
        }
        if (choice.length > TWITCH_POLL_CHOICE_MAX_LENGTH) {
            throw new PlatformValidationError("Twitch poll choices must be 25 characters or fewer.", { platform: TWITCH_PLATFORM });
        }
    }
    if (!Number.isInteger(request.durationSeconds) ||
        request.durationSeconds < TWITCH_POLL_DURATION_MIN_SECONDS ||
        request.durationSeconds > TWITCH_POLL_DURATION_MAX_SECONDS) {
        throw new PlatformValidationError("Twitch poll durationSeconds must be between 15 and 1800.", { platform: TWITCH_PLATFORM });
    }
    if (request.channelPointsPerVote !== undefined &&
        (!Number.isInteger(request.channelPointsPerVote) ||
            request.channelPointsPerVote < 1 ||
            request.channelPointsPerVote > TWITCH_CHANNEL_POINTS_PER_VOTE_MAX)) {
        throw new PlatformValidationError("Twitch channelPointsPerVote must be between 1 and 1000000.", { platform: TWITCH_PLATFORM });
    }
}
function validateTwitchEndPollRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Twitch end poll request is required.", { platform: TWITCH_PLATFORM });
    }
    validateBroadcasterId(request.broadcasterId);
    if (!request.pollId || typeof request.pollId !== "string") {
        throw new PlatformValidationError("pollId is required and must be a string.", { platform: TWITCH_PLATFORM });
    }
}
function validateBroadcasterId(broadcasterId) {
    if (!broadcasterId || typeof broadcasterId !== "string") {
        throw new PlatformValidationError("broadcasterId is required and must be a string.", { platform: TWITCH_PLATFORM });
    }
}
function validatePollBroadcasterAccess(broadcasterId, userId) {
    if (userId !== broadcasterId) {
        throw new PlatformValidationError("Twitch poll broadcasterId must match the userAccessToken user id.", { platform: TWITCH_PLATFORM });
    }
}
function normalizeTwitchPollResponse(payload, includeRaw) {
    const poll = payload.data?.[0];
    if (!poll) {
        throw new PlatformApiError("Twitch poll response did not include data[0].", {
            platform: TWITCH_PLATFORM,
            cause: payload,
        });
    }
    if (!poll.id) {
        throw new PlatformApiError("Twitch poll response did not include an id.", {
            platform: TWITCH_PLATFORM,
            cause: payload,
        });
    }
    return {
        platform: TWITCH_PLATFORM,
        pollId: poll.id,
        question: poll.title ?? null,
        choices: (poll.choices ?? []).map((choice) => ({
            id: choice.id ?? null,
            text: choice.title ?? "",
            votes: typeof choice.votes === "number" ? choice.votes : null,
        })),
        status: normalizeTwitchPollStatus(poll.status),
        endReason: normalizeTwitchPollEndReason(poll.status),
        durationSeconds: typeof poll.duration === "number" ? poll.duration : null,
        createdAt: normalizeNullableDate(poll.started_at ?? undefined),
        endedAt: normalizeNullableDate(poll.ended_at ?? undefined),
        ...(includeRaw ? { raw: payload } : {}),
    };
}
function normalizeTwitchPollStatus(status) {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === "active") {
        return "active";
    }
    if (normalizedStatus === "completed" ||
        normalizedStatus === "terminated" ||
        normalizedStatus === "archived" ||
        normalizedStatus === "moderated" ||
        normalizedStatus === "invalid") {
        return "ended";
    }
    return "unknown";
}
function normalizeTwitchPollEndReason(status) {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === "active") {
        return null;
    }
    if (normalizedStatus === "completed") {
        return "completed";
    }
    if (normalizedStatus === "terminated") {
        return "cancelled";
    }
    if (normalizedStatus === "archived" ||
        normalizedStatus === "moderated" ||
        normalizedStatus === "invalid") {
        return normalizedStatus;
    }
    if (normalizedStatus === "unknown") {
        return "unknown";
    }
    return null;
}
function normalizeNullableDate(value) {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}
