import { PlatformValidationError } from "../../errors.js";
import { TWITCH_PLATFORM } from "./constants.js";
import { SUPPORTED_TWITCH_CHANNEL_METRICS } from "./constants.js";
import { SUPPORTED_TWITCH_VIDEO_METRICS } from "./constants.js";
export function validateTwitchConfig(config) {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Twitch config is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    const clientId = readNonEmptyString(config, "clientId");
    if (!clientId) {
        throw new PlatformValidationError("Twitch clientId is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    const configRecord = config;
    const appAccessToken = readNonEmptyString(configRecord, "appAccessToken");
    const userAccessToken = readNonEmptyString(configRecord, "userAccessToken");
    const userRefreshToken = readNonEmptyString(configRecord, "userRefreshToken");
    const accessToken = readNonEmptyString(configRecord, "accessToken");
    const clientSecret = readNonEmptyString(configRecord, "clientSecret");
    if (!appAccessToken && !userAccessToken && !userRefreshToken && !accessToken) {
        throw new PlatformValidationError("Twitch appAccessToken, userAccessToken, or userRefreshToken is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (userRefreshToken && !clientSecret) {
        throw new PlatformValidationError("Twitch clientSecret is required when userRefreshToken is provided.", {
            platform: TWITCH_PLATFORM,
        });
    }
}
export function resolveTwitchClientTokens(config) {
    const fallbackAccessToken = normalizeNonEmptyString(config.accessToken);
    return {
        appAccessToken: normalizeNonEmptyString(config.appAccessToken) ?? fallbackAccessToken,
        userAccessToken: normalizeNonEmptyString(config.userAccessToken) ?? fallbackAccessToken,
    };
}
export function requireTwitchResolveAccessToken(options, feature) {
    const accessToken = options.appAccessToken ?? options.userAccessToken;
    if (accessToken) {
        return accessToken;
    }
    throw new PlatformValidationError(`Twitch appAccessToken or userAccessToken is required for ${feature}.`, {
        platform: TWITCH_PLATFORM,
    });
}
export function requireTwitchUserAccessToken(userAccessToken, feature) {
    if (userAccessToken) {
        return userAccessToken;
    }
    throw new PlatformValidationError(`Twitch userAccessToken is required for ${feature}.`, {
        platform: TWITCH_PLATFORM,
    });
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
export function validateChannelResolveRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("login" in request) || typeof request.login !== "string") {
        throw new PlatformValidationError("login is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!normalizeTwitchLogin(request.login)) {
        throw new PlatformValidationError("login is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
}
export function validateChannelMetricsRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel metrics request is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("channelId" in request) || !request.channelId) {
        throw new PlatformValidationError("channelId is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    for (const metric of request.metrics) {
        if (!SUPPORTED_TWITCH_CHANNEL_METRICS.has(metric)) {
            throw new PlatformValidationError(`Twitch channel metric "${metric}" is not supported yet.`, { platform: TWITCH_PLATFORM });
        }
    }
}
export function validateVideoMetricsRequest(request) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("videoId" in request) || !request.videoId) {
        throw new PlatformValidationError("videoId is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("metrics" in request) ||
        !Array.isArray(request.metrics) ||
        request.metrics.length === 0) {
        throw new PlatformValidationError("At least one metric is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    for (const metric of request.metrics) {
        if (!SUPPORTED_TWITCH_VIDEO_METRICS.has(metric)) {
            throw new PlatformValidationError(`Twitch video metric "${metric}" is not supported yet.`, { platform: TWITCH_PLATFORM });
        }
    }
}
export function normalizeTwitchLogin(value) {
    return value.trim().toLowerCase();
}
