import type { GoogleYoutubeClient } from "./google-client.js";
import type { YoutubeChannelsClient } from "./types.js";
/**
 * Dependencies required to create the YouTube channel client.
 */
export type YoutubeChannelsClientOptions = {
    /**
   * Official Google APIs YouTube client.
   */
    youtubeApiClient: GoogleYoutubeClient;
};
/**
 * Create channel-level methods for the YouTube provider.
 */
export declare function createYoutubeChannelsClient(options: YoutubeChannelsClientOptions): YoutubeChannelsClient;
