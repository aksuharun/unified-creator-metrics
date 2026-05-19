import { google, type youtube_v3 } from "googleapis"

/**
 * Configuration for the official Google APIs YouTube client.
 */
export type GoogleYoutubeClientConfig = {
    /**
   * YouTube Data API key.
   */
    apiKey: string
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
    return google.youtube({
        version: "v3",
        auth: config.apiKey,
    })
}
