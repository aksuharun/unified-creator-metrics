import { KICK_PLATFORM } from "./constants.js";
import { createKickUserAccessTokenProvider } from "./auth.js";
import { createKickChannelsClient } from "./channels.js";
import { createKickChatClient } from "./chat.js";
import { resolveKickClientTokens, validateKickConfig } from "./validation.js";
import { createKickVideosClient } from "./videos.js";
import { createKickLivestreamsClient } from "./livestreams.js";
/**
 * Create a Kick provider client.
 *
 * Kick currently exposes livestream `viewer_count` publicly, which is
 * normalized to `concurrentViewers`.
 */
export function createKickClient(config) {
    validateKickConfig(config);
    const tokens = resolveKickClientTokens(config);
    const userAccessTokenProvider = createKickUserAccessTokenProvider({
        accessToken: tokens.userAccessToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.userRefreshToken,
        onTokenUpdate: config.onUserTokenUpdate,
    });
    return {
        platform: KICK_PLATFORM,
        channels: createKickChannelsClient({
            appAccessToken: tokens.appAccessToken,
        }),
        videos: createKickVideosClient({
            appAccessToken: tokens.appAccessToken,
        }),
        chat: createKickChatClient({
            appAccessToken: tokens.appAccessToken,
            userAccessTokenProvider,
        }),
        livestreams: createKickLivestreamsClient({
            appAccessToken: tokens.appAccessToken,
        }),
    };
}
