import { PlatformValidationError } from "../../errors.js"
import {
    SUPPORTED_YOUTUBE_CHANNEL_METRICS,
    SUPPORTED_YOUTUBE_VIDEO_METRICS,
    YOUTUBE_PLATFORM,
} from "./constants.js"
import type {
    ChannelMetricsRequest,
    VideoMetricsRequest,
    YoutubeChannelResolveRequest,
    YoutubeClientConfig,
    YoutubeActiveLivestreamsRequest,
    YoutubeScheduledLivestreamsRequest,
} from "./types.js"

type ValidatedYoutubeClientConfig = YoutubeClientConfig

export function validateYoutubeConfig(
    config: unknown,
): asserts config is ValidatedYoutubeClientConfig {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("YouTube config is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    const hasApiKey = "apiKey" in config && typeof config.apiKey === "string" && config.apiKey.length > 0
    const hasOauth2Client = "oauth2Client" in config && config.oauth2Client
    const hasAccessToken = "accessToken" in config && typeof config.accessToken === "string" && config.accessToken.length > 0
    const hasRefreshToken =
        "refreshToken" in config &&
        typeof config.refreshToken === "string" &&
        config.refreshToken.length > 0
    const hasClientId =
        "clientId" in config &&
        typeof config.clientId === "string" &&
        config.clientId.length > 0
    const hasClientSecret =
        "clientSecret" in config &&
        typeof config.clientSecret === "string" &&
        config.clientSecret.length > 0

    if (!hasApiKey && !hasOauth2Client && !hasAccessToken && !hasRefreshToken) {
        throw new PlatformValidationError("YouTube apiKey, oauth2Client, accessToken, or refreshToken is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (hasRefreshToken && (!hasClientId || !hasClientSecret)) {
        throw new PlatformValidationError(
            "YouTube clientId and clientSecret are required when refreshToken is provided.",
            {
                platform: YOUTUBE_PLATFORM,
            },
        )
    }
}

export function validateChannelMetricsRequest(
    request: unknown,
): asserts request is ChannelMetricsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel metrics request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!("channelId" in request) || !request.channelId) {
        throw new PlatformValidationError("channelId is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (
        !("metrics" in request) ||
    !Array.isArray(request.metrics) ||
    request.metrics.length === 0
    ) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    for (const metric of request.metrics) {
        if (!SUPPORTED_YOUTUBE_CHANNEL_METRICS.has(metric)) {
            throw new PlatformValidationError(
                `YouTube channel metric "${metric}" is not supported yet.`,
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }
}

export function validateChannelResolveRequest(
    request: unknown,
): asserts request is YoutubeChannelResolveRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!("handle" in request) || typeof request.handle !== "string") {
        throw new PlatformValidationError("handle is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!normalizeYoutubeHandle(request.handle)) {
        throw new PlatformValidationError("handle is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }
}

export function validateVideoMetricsRequest(
    request: unknown,
): asserts request is VideoMetricsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!("videoId" in request) || !request.videoId) {
        throw new PlatformValidationError("videoId is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (
        !("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0
    ) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    for (const metric of request.metrics) {
        if (!SUPPORTED_YOUTUBE_VIDEO_METRICS.has(metric)) {
            throw new PlatformValidationError(
                `YouTube video metric "${metric}" is not supported yet.`,
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }
}

export function normalizeYoutubeHandle(value: string): string {
    const trimmed = value.trim()

    if (!trimmed) {
        return ""
    }

    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

export function validateActiveLivestreamsRequest(
    request: unknown,
): asserts request is YoutubeActiveLivestreamsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Active livestreams request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!("channelId" in request) || typeof request.channelId !== "string" || !request.channelId.trim()) {
        throw new PlatformValidationError("channelId must be a non-empty string.", {
            platform: YOUTUBE_PLATFORM,
        })
    }
}

export function validateScheduledLivestreamsRequest(
    request: unknown,
): asserts request is YoutubeScheduledLivestreamsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Scheduled livestreams request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!("channelId" in request) || typeof request.channelId !== "string" || !request.channelId.trim()) {
        throw new PlatformValidationError("channelId must be a non-empty string.", {
            platform: YOUTUBE_PLATFORM,
        })
    }
}
