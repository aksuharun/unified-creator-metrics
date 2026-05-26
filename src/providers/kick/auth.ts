import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { KICK_PLATFORM } from "./constants.js"

const KICK_TOKEN_ENDPOINT = "https://id.kick.com/oauth/token"
const TOKEN_EXPIRY_SKEW_MS = 60_000

export type KickUserTokenUpdate = {
    accessToken: string
    refreshToken: string
    expiresIn: number | null
    expiresAt: string | null
    scope: string | null
    tokenType: string | null
}

export type KickRefreshTokenConfig = {
    clientId: string
    clientSecret: string
    refreshToken: string
}

export type KickUserAccessTokenProviderConfig = {
    accessToken?: string
    clientId?: string
    clientSecret?: string
    refreshToken?: string
    onTokenUpdate?: (tokens: KickUserTokenUpdate) => void | Promise<void>
}

export type KickUserAccessTokenProvider = {
    getAccessToken(): Promise<string>
    refreshAccessToken(): Promise<string>
    canRefresh: boolean
}

type KickTokenRefreshResponse = {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    token_type?: string
}

export async function refreshKickAccessToken(
    config: KickRefreshTokenConfig,
): Promise<KickUserTokenUpdate> {
    validateKickRefreshTokenConfig(config)

    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
    })

    let response: Response

    try {
        response = await fetch(KICK_TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        })
    } catch (error) {
        throw new PlatformApiError("Kick token refresh failed.", {
            platform: KICK_PLATFORM,
            cause: error,
        })
    }

    const text = await response.text()
    const payload = text ? (JSON.parse(text) as KickTokenRefreshResponse) : {}

    if (!response.ok) {
        throw new PlatformApiError("Kick token refresh failed.", {
            platform: KICK_PLATFORM,
            status: response.status,
            cause: payload,
        })
    }

    if (!payload.access_token) {
        throw new PlatformApiError(
            "Kick token refresh response did not include an access token.",
            {
                platform: KICK_PLATFORM,
                status: response.status,
                cause: payload,
            },
        )
    }

    const expiresIn =
        typeof payload.expires_in === "number" ? payload.expires_in : null

    return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? config.refreshToken,
        expiresIn,
        expiresAt:
            expiresIn === null
                ? null
                : new Date(Date.now() + expiresIn * 1000).toISOString(),
        scope: payload.scope ?? null,
        tokenType: payload.token_type ?? null,
    }
}

export function createKickUserAccessTokenProvider(
    config: KickUserAccessTokenProviderConfig,
): KickUserAccessTokenProvider | undefined {
    const accessToken = normalizeNonEmptyString(config.accessToken)
    const refreshToken = normalizeNonEmptyString(config.refreshToken)

    if (!accessToken && !refreshToken) {
        return undefined
    }

    let currentAccessToken = accessToken
    let currentRefreshToken = refreshToken
    let expiresAtMs: number | undefined
    let refreshPromise: Promise<string> | undefined

    const refreshAccessToken = async (): Promise<string> => {
        if (!currentRefreshToken) {
            throw new PlatformValidationError(
                "Kick userRefreshToken is required to refresh the user access token.",
                { platform: KICK_PLATFORM },
            )
        }

        if (!config.clientId?.trim()) {
            throw new PlatformValidationError(
                "Kick clientId is required when userRefreshToken is configured.",
                { platform: KICK_PLATFORM },
            )
        }

        if (!config.clientSecret?.trim()) {
            throw new PlatformValidationError(
                "Kick clientSecret is required when userRefreshToken is configured.",
                { platform: KICK_PLATFORM },
            )
        }

        const clientId = config.clientId
        const clientSecret = config.clientSecret

        if (refreshPromise) {
            return refreshPromise
        }

        refreshPromise = (async () => {
            const nextTokens = await refreshKickAccessToken({
                clientId,
                clientSecret,
                refreshToken: currentRefreshToken,
            })

            currentAccessToken = nextTokens.accessToken
            currentRefreshToken = nextTokens.refreshToken
            expiresAtMs = nextTokens.expiresAt
                ? Date.parse(nextTokens.expiresAt)
                : undefined

            await config.onTokenUpdate?.(nextTokens)

            return nextTokens.accessToken
        })().finally(() => {
            refreshPromise = undefined
        })

        return refreshPromise
    }

    return {
        canRefresh: Boolean(currentRefreshToken),
        async getAccessToken(): Promise<string> {
            if (
                currentAccessToken &&
                (
                    expiresAtMs === undefined ||
                    expiresAtMs - Date.now() > TOKEN_EXPIRY_SKEW_MS
                )
            ) {
                return currentAccessToken
            }

            if (currentRefreshToken) {
                return refreshAccessToken()
            }

            if (currentAccessToken) {
                return currentAccessToken
            }

            throw new PlatformValidationError(
                "Kick userAccessToken or userRefreshToken is required.",
                { platform: KICK_PLATFORM },
            )
        },
        refreshAccessToken,
    }
}

function validateKickRefreshTokenConfig(config: KickRefreshTokenConfig): void {
    if (!config.clientId.trim()) {
        throw new PlatformValidationError("Kick clientId is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!config.clientSecret.trim()) {
        throw new PlatformValidationError("Kick clientSecret is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!config.refreshToken.trim()) {
        throw new PlatformValidationError("Kick refreshToken is required.", {
            platform: KICK_PLATFORM,
        })
    }
}

function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const trimmedValue = value.trim()

    if (!trimmedValue) {
        return undefined
    }

    return trimmedValue
}
