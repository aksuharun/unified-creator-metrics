import type { GoogleYoutubeClient } from "./google-client.js";
import type { YoutubeChatClient } from "./types.js";
type YoutubeChatClientOptions = {
    youtubeApiClient: GoogleYoutubeClient;
};
/**
 * Create the YouTube chat capability object exposed as `youtube.chat`.
 */
export declare function createYoutubeChatClient(options: YoutubeChatClientOptions): YoutubeChatClient;
export {};
