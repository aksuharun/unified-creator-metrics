import { PlatformValidationError } from "../../errors.js";
import { KICK_PLATFORM, SUPPORTED_KICK_VIDEO_METRICS } from "./constants.js";
export function validateKickConfig(config) {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Kick config is required.", {
            platform: KICK_PLATFORM,
        });
    }
    const configRecord = config;
    const appAccessToken = readNonEmptyString(configRecord, "appAccessToken");
    const userAccessToken = readNonEmptyString(configRecord, "userAccessToken");
    const userRefreshToken = readNonEmptyString(configRecord, "userRefreshToken");
    const accessToken = readNonEmptyString(configRecord, "accessToken");
    const clientId = readNonEmptyString(configRecord, "clientId");
    const clientSecret = readNonEmptyString(configRecord, "clientSecret");
    if (!appAccessToken && !userAccessToken && !userRefreshToken && !accessToken) {
        throw new PlatformValidationError("Kick appAccessToken, userAccessToken, or userRefreshToken is required.", {
            platform: KICK_PLATFORM,
        });
    }
    if (userRefreshToken && (!clientId || !clientSecret)) {
        throw new PlatformValidationError("Kick clientId and clientSecret are required when userRefreshToken is provided.", {
            platform: KICK_PLATFORM,
        });
    }
}
export function resolveKickClientTokens(config) {
    const fallbackAccessToken = normalizeNonEmptyString(config.accessToken);
    return {
        appAccessToken: normalizeNonEmptyString(config.appAccessToken) ?? fallbackAccessToken,
        userAccessToken: normalizeNonEmptyString(config.userAccessToken) ?? fallbackAccessToken,
    };
}
function readNonEmptyString(value, key) {
    if (!(key in value)) {
        return undefined;
    }
    return normalizeNonEmptyString(value[key]);
}
function normalizeNonEmptyString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
        return undefined;
    }
    return trimmedValue;
}
export function requireKickAppAccessToken(appAccessToken, feature) {
    if (appAccessToken) {
        return appAccessToken;
    }
    throw new PlatformValidationError(`Kick appAccessToken is required for ${feature}.`, {
        platform: KICK_PLATFORM,
    });
}
export function requireKickUserAccessToken(userAccessToken, feature) {
    if (userAccessToken) {
        return userAccessToken;
    }
    throw new PlatformValidationError(`Kick userAccessToken is required for ${feature}.`, {
        platform: KICK_PLATFORM,
    });
}
export function validateVideoMetricsRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.", {
            platform: KICK_PLATFORM,
        });
    }
    if (!("videoId" in request) || !request.videoId) {
        throw new PlatformValidationError("videoId is required.", {
            platform: KICK_PLATFORM,
        });
    }
    if (!("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: KICK_PLATFORM,
        });
    }
    for (const metric of request.metrics) {
        if (!SUPPORTED_KICK_VIDEO_METRICS.has(metric)) {
            throw new PlatformValidationError(`Kick video metric "${metric}" is not supported yet.`, { platform: KICK_PLATFORM });
        }
    }
}
export function validateChannelResolveRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.", {
            platform: KICK_PLATFORM,
        });
    }
    if (!("slug" in request) || typeof request.slug !== "string") {
        throw new PlatformValidationError("slug is required.", {
            platform: KICK_PLATFORM,
        });
    }
    if (!normalizeKickSlug(request.slug)) {
        throw new PlatformValidationError("slug is required.", {
            platform: KICK_PLATFORM,
        });
    }
}
export function normalizeKickSlug(value) {
    return value.trim().toLowerCase();
}
