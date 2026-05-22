import { PlatformValidationError } from "../../errors.js";
import { TWITCH_PLATFORM } from "./constants.js";
import { SUPPORTED_TWITCH_CHANNEL_METRICS } from "./constants.js";
export function validateTwitchConfig(config) {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Twitch config is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("clientId" in config) || !config.clientId) {
        throw new PlatformValidationError("Twitch clientId is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!("accessToken" in config) || !config.accessToken) {
        throw new PlatformValidationError("Twitch accessToken is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
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
export function normalizeTwitchLogin(value) {
    return value.trim().toLowerCase();
}
