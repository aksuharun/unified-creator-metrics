import { KICK_PLATFORM } from "./constants.js"
import { createKickChannelsClient } from "./channels.js"
import { createKickChatClient } from "./chat.js"
import { validateKickConfig } from "./validation.js"
import { createKickVideosClient } from "./videos.js"
import type { KickClient, KickClientConfig } from "./types.js"

/**
 * Create a Kick provider client.
 *
 * Kick currently exposes livestream `viewer_count` publicly, which is
 * normalized to `concurrentViewers`.
 */
export function createKickClient(config: KickClientConfig): KickClient {
    validateKickConfig(config)

    return {
        platform: KICK_PLATFORM,
        channels: createKickChannelsClient({
            accessToken: config.accessToken,
        }),
        videos: createKickVideosClient({
            accessToken: config.accessToken,
        }),
        chat: createKickChatClient({
            accessToken: config.accessToken,
        }),
    }
}
