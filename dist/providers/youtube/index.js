import { createYoutubeChatClient } from "./chat.js";
import { createYoutubeChannelsClient } from "./channels.js";
import { YOUTUBE_PLATFORM } from "./constants.js";
import { createGoogleYoutubeClient, } from "./google-client.js";
import { validateYoutubeConfig } from "./validation.js";
import { createYoutubeVideosClient } from "./videos.js";
/**
 * Create a YouTube provider client.
 *
 * This client uses normalized metric names. For example, request `followers`
 * even though YouTube calls the value `subscriberCount`.
 */
export function createYoutubeClient(config) {
    validateYoutubeConfig(config);
    const youtubeApiClient = createGoogleYoutubeClient({
        apiKey: config.apiKey,
        oauth2Client: config.oauth2Client,
        accessToken: config.accessToken,
    });
    return {
        platform: YOUTUBE_PLATFORM,
        channels: createYoutubeChannelsClient({
            youtubeApiClient,
        }),
        videos: createYoutubeVideosClient({
            youtubeApiClient,
        }),
        chat: createYoutubeChatClient({
            youtubeApiClient,
        }),
    };
}
export { createGoogleYoutubeClient } from "./google-client.js";
