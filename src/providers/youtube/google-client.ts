import { google, type youtube_v3 } from "googleapis"

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
}

/**
 * Official Google APIs YouTube v3 client instance.
 */
export type GoogleYoutubeClient = youtube_v3.Youtube

/**
 * Create the official Google APIs YouTube client.
 */
export function createGoogleYoutubeClient(
    config: GoogleYoutubeClientConfig,
): GoogleYoutubeClient {
    let auth: GoogleYoutubeAuthClient | string | undefined = config.apiKey
    if (config.oauth2Client) {
        auth = config.oauth2Client
    } else if (config.accessToken) {
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: config.accessToken })
        auth = oauth2Client
    }

    return google.youtube({
        version: "v3",
        auth,
    })
}
