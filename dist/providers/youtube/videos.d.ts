import type { GoogleYoutubeClient } from "./google-client.js";
import type { YoutubeVideosClient } from "./types.js";
/**
 * Dependencies required to create the YouTube video client.
 */
export type YoutubeVideosClientOptions = {
    /**
   * Official Google APIs YouTube client.
   */
    youtubeApiClient: GoogleYoutubeClient;
};
/**
 * Create video-level methods for the YouTube provider.
 */
export declare function createYoutubeVideosClient(options: YoutubeVideosClientOptions): YoutubeVideosClient;
