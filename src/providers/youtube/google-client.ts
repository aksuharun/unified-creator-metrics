import { google, type youtube_v3 } from "googleapis"
import type { YoutubeTokenRefreshResult } from "./auth.js"

export type GoogleYoutubeAuthClient = Exclude<
    youtube_v3.Options["auth"],
    string | undefined
>

/**
 * Configuration for the official Google APIs YouTube client.
 */
export type GoogleYoutubeClientConfig = {
    /**
   * YouTube Data API key.
   */
    apiKey?: string
    /**
     * Pre-configured OAuth2 Client or auth client instance.
     */
    oauth2Client?: GoogleYoutubeAuthClient
    /**
     * Raw OAuth 2.0 access token string.
     */
    accessToken?: string
    /**
     * Google OAuth application client id.
     */
    clientId?: string
    /**
     * Google OAuth application client secret.
     */
    clientSecret?: string
    /**
     * Google OAuth refresh token used to obtain new access tokens.
     */
    refreshToken?: string
    /**
     * Called when the internally managed OAuth2 client receives new token
     * material from Google.
     */
    onTokenUpdate?: (
        tokens: YoutubeTokenRefreshResult,
    ) => void | Promise<void>
}

/**
 * Official Google APIs YouTube v3 client instance.
 */
export type GoogleYoutubeClient = youtube_v3.Youtube

export function createGoogleYoutubeAuthClient(
    config: GoogleYoutubeClientConfig,
): GoogleYoutubeAuthClient | undefined {
    if (config.oauth2Client) {
        return config.oauth2Client
    }

    if (!config.refreshToken && !config.accessToken) {
        return undefined
    }

    const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
    )
    let currentRefreshToken = config.refreshToken

    oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
    })

    const onTokenUpdate = config.onTokenUpdate

    if (onTokenUpdate) {
        oauth2Client.on("tokens", (tokens) => {
            const accessToken = tokens.access_token

            if (!accessToken) {
                return
            }

            currentRefreshToken = tokens.refresh_token ?? currentRefreshToken

            void onTokenUpdate({
                accessToken,
                refreshToken: currentRefreshToken ?? "",
                expiresIn:
                    typeof tokens.expiry_date === "number"
                        ? Math.max(
                            Math.floor((tokens.expiry_date - Date.now()) / 1000),
                            0,
                        )
                        : null,
                expiresAt:
                    typeof tokens.expiry_date === "number"
                        ? new Date(tokens.expiry_date).toISOString()
                        : null,
                scope: typeof tokens.scope === "string" ? tokens.scope : null,
                tokenType:
                    typeof tokens.token_type === "string"
                        ? tokens.token_type
                        : null,
            })
        })
    }

    return oauth2Client
}

/**
 * Create the official Google APIs YouTube client.
 */
export function createGoogleYoutubeClient(
    config: GoogleYoutubeClientConfig,
): GoogleYoutubeClient {
    const auth = createGoogleYoutubeAuthClient(config) ?? config.apiKey

    return google.youtube({
        version: "v3",
        auth,
    })
}
