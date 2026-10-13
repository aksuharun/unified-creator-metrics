import { PlatformApiError, PlatformValidationError } from "../../errors.js";
import { TWITCH_PLATFORM } from "./constants.js";
const TWITCH_TOKEN_ENDPOINT = "https://id.twitch.tv/oauth2/token";
const TOKEN_EXPIRY_SKEW_MS = 60_000;
export async function refreshTwitchAccessToken(config) {
    validateTwitchRefreshTokenConfig(config);
    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
    });
    let response;
    try {
        response = await fetch(TWITCH_TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        });
    }
    catch (error) {
        throw new PlatformApiError("Twitch token refresh failed.", {
            platform: TWITCH_PLATFORM,
            cause: error,
        });
    }
    const text = await response.text();
    const payload = text
        ? JSON.parse(text)
        : {};
    if (!response.ok) {
        throw new PlatformApiError("Twitch token refresh failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
            cause: payload,
        });
    }
    if (!payload.access_token) {
        throw new PlatformApiError("Twitch token refresh response did not include an access token.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
            cause: payload,
        });
    }
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : null;
    return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? config.refreshToken,
        expiresIn,
        expiresAt: expiresIn === null
            ? null
            : new Date(Date.now() + expiresIn * 1000).toISOString(),
        scope: Array.isArray(payload.scope) ? payload.scope : [],
        tokenType: payload.token_type ?? null,
    };
}
export function createTwitchUserAccessTokenProvider(config) {
    const accessToken = normalizeNonEmptyString(config.accessToken);
    const refreshToken = normalizeNonEmptyString(config.refreshToken);
    if (!accessToken && !refreshToken) {
        return undefined;
    }
    let currentAccessToken = accessToken;
    let currentRefreshToken = refreshToken;
    let expiresAtMs;
    let refreshPromise;
    const refreshAccessToken = async () => {
        if (!currentRefreshToken) {
            throw new PlatformValidationError("Twitch userRefreshToken is required to refresh the user access token.", { platform: TWITCH_PLATFORM });
        }
        if (!config.clientSecret?.trim()) {
            throw new PlatformValidationError("Twitch clientSecret is required when userRefreshToken is configured.", { platform: TWITCH_PLATFORM });
        }
        const clientSecret = config.clientSecret;
        if (refreshPromise) {
            return refreshPromise;
        }
        refreshPromise = (async () => {
            const nextTokens = await refreshTwitchAccessToken({
                clientId: config.clientId,
                clientSecret,
                refreshToken: currentRefreshToken,
            });
            currentAccessToken = nextTokens.accessToken;
            currentRefreshToken = nextTokens.refreshToken;
            expiresAtMs = nextTokens.expiresAt
                ? Date.parse(nextTokens.expiresAt)
                : undefined;
            await config.onTokenUpdate?.(nextTokens);
            return nextTokens.accessToken;
        })().finally(() => {
            refreshPromise = undefined;
        });
        return refreshPromise;
    };
    return {
        canRefresh: Boolean(currentRefreshToken),
        async getAccessToken() {
            if (currentAccessToken &&
                (expiresAtMs === undefined ||
                    expiresAtMs - Date.now() > TOKEN_EXPIRY_SKEW_MS)) {
                return currentAccessToken;
            }
            if (currentRefreshToken) {
                return refreshAccessToken();
            }
            if (currentAccessToken) {
                return currentAccessToken;
            }
            throw new PlatformValidationError("Twitch userAccessToken or userRefreshToken is required.", { platform: TWITCH_PLATFORM });
        },
        refreshAccessToken,
    };
}
function validateTwitchRefreshTokenConfig(config) {
    if (!config.clientId.trim()) {
        throw new PlatformValidationError("Twitch clientId is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!config.clientSecret.trim()) {
        throw new PlatformValidationError("Twitch clientSecret is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
    if (!config.refreshToken.trim()) {
        throw new PlatformValidationError("Twitch refreshToken is required.", {
            platform: TWITCH_PLATFORM,
        });
    }
}
function normalizeNonEmptyString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return undefined;
    }
    return trimmedValue;
}
