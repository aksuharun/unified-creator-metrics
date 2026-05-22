import { PlatformValidationError } from "../../errors.js"
import { KICK_PLATFORM, SUPPORTED_KICK_VIDEO_METRICS } from "./constants.js"
import type {
    KickChannelResolveRequest,
    KickClientConfig,
    VideoMetricsRequest,
} from "./types.js"

type ValidatedKickClientConfig = KickClientConfig & {
    accessToken: string
}

export function validateKickConfig(
    config: unknown,
): asserts config is ValidatedKickClientConfig {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Kick config is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!("accessToken" in config) || !config.accessToken) {
        throw new PlatformValidationError("Kick accessToken is required.", {
            platform: KICK_PLATFORM,
        })
    }
}

export function validateVideoMetricsRequest(
    request: unknown,
): asserts request is VideoMetricsRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!("videoId" in request) || !request.videoId) {
        throw new PlatformValidationError("videoId is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (
        !("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0
    ) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: KICK_PLATFORM,
        })
    }

    for (const metric of request.metrics) {
        if (!SUPPORTED_KICK_VIDEO_METRICS.has(metric)) {
            throw new PlatformValidationError(
                `Kick video metric "${metric}" is not supported yet.`,
                { platform: KICK_PLATFORM },
            )
        }
    }
}

export function validateChannelResolveRequest(
    request: unknown,
): asserts request is KickChannelResolveRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!("slug" in request) || typeof request.slug !== "string") {
        throw new PlatformValidationError("slug is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!normalizeKickSlug(request.slug)) {
        throw new PlatformValidationError("slug is required.", {
            platform: KICK_PLATFORM,
        })
    }
}

export function normalizeKickSlug(value: string): string {
    return value.trim().toLowerCase()
}
