import { TWITCH_PLATFORM } from "./constants.js";
import { createTwitchUserAccessTokenProvider } from "./auth.js";
import { createTwitchChatClient } from "./chat.js";
import { createTwitchChannelsClient } from "./channels.js";
import { createTwitchVideosClient } from "./videos.js";
import { resolveTwitchClientTokens, validateTwitchConfig } from "./validation.js";
/**
 * Create a Twitch provider client.
 */
export function createTwitchClient(config) {
    validateTwitchConfig(config);
    const tokens = resolveTwitchClientTokens(config);
    const userAccessTokenProvider = createTwitchUserAccessTokenProvider({
        accessToken: tokens.userAccessToken,
        clientId: config.clientId ?? "",
        clientSecret: config.clientSecret,
        refreshToken: config.userRefreshToken,
        onTokenUpdate: config.onUserTokenUpdate,
    });
    return {
        platform: TWITCH_PLATFORM,
        channels: createTwitchChannelsClient({
            clientId: config.clientId,
            appAccessToken: tokens.appAccessToken,
            userAccessTokenProvider,
        }),
        videos: createTwitchVideosClient({
            clientId: config.clientId,
            appAccessToken: tokens.appAccessToken,
            userAccessTokenProvider,
        }),
        chat: createTwitchChatClient({
            clientId: config.clientId,
            userAccessTokenProvider,
        }),
    };
}
