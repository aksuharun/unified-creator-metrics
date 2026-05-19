import { PlatformValidationError } from "../../errors.js";
import { SUPPORTED_YOUTUBE_CHANNEL_METRICS, SUPPORTED_YOUTUBE_VIDEO_METRICS, YOUTUBE_PLATFORM, } from "./constants.js";
export function validateYoutubeConfig(config) {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("YouTube config is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    if (!("apiKey" in config) || !config.apiKey) {
        throw new PlatformValidationError("YouTube apiKey is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
}
export function validateChannelMetricsRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel metrics request is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    if (!("channelId" in request) || !request.channelId) {
        throw new PlatformValidationError("channelId is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    if (!("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    for (const metric of request.metrics) {
        if (!SUPPORTED_YOUTUBE_CHANNEL_METRICS.has(metric)) {
            throw new PlatformValidationError(`YouTube channel metric "${metric}" is not supported yet.`, { platform: YOUTUBE_PLATFORM });
        }
    }
}
export function validateVideoMetricsRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    if (!("videoId" in request) || !request.videoId) {
        throw new PlatformValidationError("videoId is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    if (!("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: YOUTUBE_PLATFORM,
        });
    }
    for (const metric of request.metrics) {
        if (!SUPPORTED_YOUTUBE_VIDEO_METRICS.has(metric)) {
            throw new PlatformValidationError(`YouTube video metric "${metric}" is not supported yet.`, { platform: YOUTUBE_PLATFORM });
        }
    }
}
