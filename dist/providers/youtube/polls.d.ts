import type { GoogleYoutubeClient } from "./google-client.js";
import type { YoutubePollsClient } from "./types.js";
type YoutubePollsClientOptions = {
    youtubeApiClient: GoogleYoutubeClient;
};
/**
 * Create the YouTube polls capability object exposed as `youtube.polls`.
 */
export declare function createYoutubePollsClient(options: YoutubePollsClientOptions): YoutubePollsClient;
export {};
