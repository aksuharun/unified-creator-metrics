import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { YOUTUBE_PLATFORM } from "./constants.js"

export type YoutubeRefreshTokenConfig = {
    clientId: string
    clientSecret: string
    refreshToken: string
}

export type YoutubeTokenRefreshResult = {
    accessToken: string
    refreshToken: string
    expiresIn: number | null
    expiresAt: string | null
    scope: string | null
    tokenType: string | null
}

type YoutubeTokenRefreshResponse = {
    access_token?: string
    expires_in?: number
    scope?: string
    token_type?: string
}

const YOUTUBE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

export async function refreshYoutubeAccessToken(
    config: YoutubeRefreshTokenConfig,
): Promise<YoutubeTokenRefreshResult> {
    validateYoutubeRefreshTokenConfig(config)

    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
    })

    let response: Response

    try {
        response = await fetch(YOUTUBE_TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        })
    } catch (error) {
        throw new PlatformApiError("YouTube token refresh failed.", {
            platform: YOUTUBE_PLATFORM,
            cause: error,
        })
    }

    const text = await response.text()
    const payload = text
        ? (JSON.parse(text) as YoutubeTokenRefreshResponse)
        : {}

    if (!response.ok) {
        throw new PlatformApiError("YouTube token refresh failed.", {
            platform: YOUTUBE_PLATFORM,
            status: response.status,
            cause: payload,
        })
    }

    if (!payload.access_token) {
        throw new PlatformApiError(
            "YouTube token refresh response did not include an access token.",
            {
                platform: YOUTUBE_PLATFORM,
                status: response.status,
                cause: payload,
            },
        )
    }

    const expiresIn =
        typeof payload.expires_in === "number" ? payload.expires_in : null

    return {
        accessToken: payload.access_token,
        refreshToken: config.refreshToken,
        expiresIn,
        expiresAt:
            expiresIn === null
                ? null
                : new Date(Date.now() + expiresIn * 1000).toISOString(),
        scope: payload.scope ?? null,
        tokenType: payload.token_type ?? null,
    }
}

function validateYoutubeRefreshTokenConfig(
    config: YoutubeRefreshTokenConfig,
): void {
    if (!config.clientId.trim()) {
        throw new PlatformValidationError("YouTube clientId is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!config.clientSecret.trim()) {
        throw new PlatformValidationError("YouTube clientSecret is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!config.refreshToken.trim()) {
        throw new PlatformValidationError("YouTube refreshToken is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }
}
