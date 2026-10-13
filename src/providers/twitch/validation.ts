import { PlatformValidationError } from "../../errors.js"
import { TWITCH_PLATFORM } from "./constants.js"
import { SUPPORTED_TWITCH_CHANNEL_METRICS } from "./constants.js"
import { SUPPORTED_TWITCH_VIDEO_METRICS } from "./constants.js"
import type {
    ChannelMetricsRequest,
    VideoMetricsRequest,
    TwitchChannelResolveRequest,
    TwitchClientConfig,
    TwitchActiveLivestreamsRequest,
    TwitchScheduledLivestreamsRequest,
} from "./types.js"

type ValidatedTwitchClientConfig = TwitchClientConfig & {
    clientId: string
} & (
        | { appAccessToken: string }
        | { userAccessToken: string }
        | { userRefreshToken: string }
        | { accessToken: string }
    )

export function validateTwitchConfig(
    config: unknown,
): asserts config is ValidatedTwitchClientConfig {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Twitch config is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    const clientId = readNonEmptyString(config as Record<string, unknown>, "clientId")

    if (!clientId) {
        throw new PlatformValidationError("Twitch clientId is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    const configRecord = config as Record<string, unknown>
    const appAccessToken = readNonEmptyString(configRecord, "appAccessToken")
    const userAccessToken = readNonEmptyString(configRecord, "userAccessToken")
    const userRefreshToken = readNonEmptyString(configRecord, "userRefreshToken")
    const accessToken = readNonEmptyString(configRecord, "accessToken")
    const clientSecret = readNonEmptyString(configRecord, "clientSecret")

    if (!appAccessToken && !userAccessToken && !userRefreshToken && !accessToken) {
        throw new PlatformValidationError(
            "Twitch appAccessToken, userAccessToken, or userRefreshToken is required.",
            {
                platform: TWITCH_PLATFORM,
            },
        )
    }

    if (userRefreshToken && !clientSecret) {
        throw new PlatformValidationError(
            "Twitch clientSecret is required when userRefreshToken is provided.",
            {
                platform: TWITCH_PLATFORM,
            },
        )
    }
}

export function resolveTwitchClientTokens(config: TwitchClientConfig): {
    appAccessToken?: string
    userAccessToken?: string
} {
    const fallbackAccessToken = normalizeNonEmptyString(config.accessToken)

    return {
        appAccessToken:
            normalizeNonEmptyString(config.appAccessToken) ?? fallbackAccessToken,
        userAccessToken:
            normalizeNonEmptyString(config.userAccessToken) ?? fallbackAccessToken,
    }
}

export function requireTwitchResolveAccessToken(
    options: {
        appAccessToken?: string
        userAccessToken?: string
    },
    feature: string,
): string {
    const accessToken = options.appAccessToken ?? options.userAccessToken

    if (accessToken) {
        return accessToken
    }

    throw new PlatformValidationError(
        `Twitch appAccessToken or userAccessToken is required for ${feature}.`,
        {
            platform: TWITCH_PLATFORM,
        },
    )
}

export function requireTwitchUserAccessToken(
    userAccessToken: string | undefined,
    feature: string,
): string {
    if (userAccessToken) {
        return userAccessToken
    }

    throw new PlatformValidationError(
        `Twitch userAccessToken is required for ${feature}.`,
        {
            platform: TWITCH_PLATFORM,
        },
    )
}

function readNonEmptyString(
    value: Record<string, unknown>,
    key:
        | "clientId"
        | "clientSecret"
        | "appAccessToken"
        | "userAccessToken"
        | "userRefreshToken"
        | "accessToken",
): string | undefined {
    if (!(key in value)) {
        return undefined
    }

    return normalizeNonEmptyString(value[key])
}

function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const trimmedValue = value.trim()

    if (trimmedValue.length === 0) {
        return undefined
    }

    return trimmedValue
}

export function validateChannelResolveRequest(
    request: unknown,
): asserts request is TwitchChannelResolveRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (!("login" in request) || typeof request.login !== "string") {
        throw new PlatformValidationError("login is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (!normalizeTwitchLogin(request.login)) {
        throw new PlatformValidationError("login is required.", {
            platform: TWITCH_PLATFORM,
        })
    }
}

export function validateChannelMetricsRequest(
    request: unknown,
): asserts request is ChannelMetricsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel metrics request is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (!("channelId" in request) || !request.channelId) {
        throw new PlatformValidationError("channelId is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (
        !("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0
    ) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    for (const metric of request.metrics) {
        if (!SUPPORTED_TWITCH_CHANNEL_METRICS.has(metric)) {
            throw new PlatformValidationError(
                `Twitch channel metric "${metric}" is not supported yet.`,
                { platform: TWITCH_PLATFORM },
            )
        }
    }
}

export function validateVideoMetricsRequest(
    request: unknown,
): asserts request is VideoMetricsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (!("videoId" in request) || !request.videoId) {
        throw new PlatformValidationError("videoId is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (
        !("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0
    ) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    for (const metric of request.metrics) {
        if (!SUPPORTED_TWITCH_VIDEO_METRICS.has(metric)) {
            throw new PlatformValidationError(
                `Twitch video metric "${metric}" is not supported yet.`,
                { platform: TWITCH_PLATFORM },
            )
        }
    }
}

export function normalizeTwitchLogin(value: string): string {
    return value.trim().toLowerCase()
}

export function validateActiveLivestreamsRequest(
    request: unknown,
): asserts request is TwitchActiveLivestreamsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Active livestreams request is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (!("channelId" in request) || typeof request.channelId !== "string" || !request.channelId.trim()) {
        throw new PlatformValidationError("channelId must be a non-empty string.", {
            platform: TWITCH_PLATFORM,
        })
    }
}

export function validateScheduledLivestreamsRequest(
    request: unknown,
): asserts request is TwitchScheduledLivestreamsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Scheduled livestreams request is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    if (!("channelId" in request) || typeof request.channelId !== "string" || !request.channelId.trim()) {
        throw new PlatformValidationError("channelId must be a non-empty string.", {
            platform: TWITCH_PLATFORM,
        })
    }
}
