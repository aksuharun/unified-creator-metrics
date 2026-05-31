import type { GoogleYoutubeClient } from "./google-client.js";
import type { YoutubeLivestreamsClient } from "./types.js";
/**
 * Dependencies required to create the YouTube livestreams client.
 */
export type YoutubeLivestreamsClientOptions = {
    /**
     * Official Google APIs YouTube client.
     */
    youtubeApiClient: GoogleYoutubeClient;
    /**
     * Whether the configured YouTube client can act on behalf of an authenticated channel.
     */
    hasAuthenticatedAccess: boolean;
};
/**
 * Create livestream methods for the YouTube provider.
 */
export declare function createYoutubeLivestreamsClient(options: YoutubeLivestreamsClientOptions): YoutubeLivestreamsClient;
