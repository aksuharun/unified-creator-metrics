import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { TWITCH_PLATFORM } from "./constants.js"
import type { TwitchUserAccessTokenProvider } from "./auth.js"

const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix"
const TWITCH_AUTH_BASE_URL = "https://id.twitch.tv/oauth2"

type TwitchTokenValidationResponse = {
    client_id?: string | null
    login?: string | null
    scopes?: string[] | null
    user_id?: string | null
}

export type TwitchValidatedUserToken = {
    userId: string
    login: string | null
}

export { TWITCH_API_BASE_URL }

/**
 * Validate a Twitch user token and ensure it includes the required scopes.
 */
export async function validateTwitchUserAccessToken(
    options: {
        clientId: string
        userAccessTokenProvider: TwitchUserAccessTokenProvider
    },
    requirements: {
        feature: string
        requiredScopes: readonly string[]
    },
): Promise<TwitchValidatedUserToken> {
    const response = await runTwitchAuthorizedRequest(
        options.userAccessTokenProvider,
        async (userAccessToken) => {
            try {
                return await fetch(`${TWITCH_AUTH_BASE_URL}/validate`, {
                    headers: {
                        Authorization: `OAuth ${userAccessToken}`,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Twitch token validation failed.", {
                    platform: TWITCH_PLATFORM,
                    cause: error,
                })
            }
        },
    )

    const text = await response.text()
    const payload = text ? (JSON.parse(text) as TwitchTokenValidationResponse) : {}

    if (!response.ok) {
        throw new PlatformApiError("Twitch token validation failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
        })
    }

    if (payload.client_id !== options.clientId) {
        throw new PlatformValidationError(
            "Twitch userAccessToken was not issued for the configured clientId.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (!payload.user_id) {
        throw new PlatformValidationError(
            "Twitch userAccessToken must be a user access token.",
            { platform: TWITCH_PLATFORM },
        )
    }

    const scopes = Array.isArray(payload.scopes) ? payload.scopes : []

    for (const scope of requirements.requiredScopes) {
        if (scopes.includes(scope)) {
            continue
        }

        throw new PlatformValidationError(
            `Twitch userAccessToken must include the "${scope}" scope for ${requirements.feature}.`,
            { platform: TWITCH_PLATFORM },
        )
    }

    return {
        userId: payload.user_id,
        login: payload.login ?? null,
    }
}

/**
 * Send an authorized request to the Twitch API and normalize transport failures.
 */
export async function twitchRequest<TPayload>(
    options: {
        clientId: string
        userAccessTokenProvider: TwitchUserAccessTokenProvider
    },
    pathOrUrl: string | URL,
    init: RequestInit = {},
): Promise<TPayload> {
    const url =
        typeof pathOrUrl === "string"
            ? `${TWITCH_API_BASE_URL}${pathOrUrl}`
            : pathOrUrl
    const response = await runTwitchAuthorizedRequest(
        options.userAccessTokenProvider,
        async (userAccessToken) => {
            try {
                return await fetch(url, {
                    ...init,
                    headers: {
                        Authorization: `Bearer ${userAccessToken}`,
                        "Client-Id": options.clientId,
                        "Content-Type": "application/json",
                        ...init.headers,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    cause: error,
                })
            }
        },
    )

    if (!response.ok) {
        throw new PlatformApiError("Twitch API request failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
        })
    }

    if (response.status === 204) {
        return undefined as TPayload
    }

    const text = await response.text()

    if (!text) {
        return {} as TPayload
    }

    try {
        return JSON.parse(text) as TPayload
    } catch (error) {
        throw new PlatformApiError("Twitch API response was not valid JSON.", {
            platform: TWITCH_PLATFORM,
            cause: error,
            status: response.status,
        })
    }
}

export function requireTwitchUserAccessTokenProvider(
    provider: TwitchUserAccessTokenProvider | undefined,
    feature: string,
): TwitchUserAccessTokenProvider {
    if (provider) {
        return provider
    }

    throw new PlatformValidationError(
        `Twitch userAccessToken is required for ${feature}.`,
        {
            platform: TWITCH_PLATFORM,
        },
    )
}

export async function runTwitchAuthorizedRequest(
    provider: TwitchUserAccessTokenProvider,
    runRequest: (accessToken: string) => Promise<Response>,
): Promise<Response> {
    const accessToken = await provider.getAccessToken()
    let response = await runRequest(accessToken)

    if (response.status === 401 && provider.canRefresh) {
        response = await runRequest(await provider.refreshAccessToken())
    }

    return response
}
