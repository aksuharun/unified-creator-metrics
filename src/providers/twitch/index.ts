import { TWITCH_PLATFORM } from "./constants.js"
import { createTwitchChatClient } from "./chat.js"
import { createTwitchChannelsClient } from "./channels.js"
import { validateTwitchConfig } from "./validation.js"
import type { TwitchClient, TwitchClientConfig } from "./types.js"

/**
 * Create a Twitch provider client.
 */
export function createTwitchClient(config: TwitchClientConfig): TwitchClient {
    validateTwitchConfig(config)

    return {
        platform: TWITCH_PLATFORM,
        channels: createTwitchChannelsClient({
            clientId: config.clientId,
            accessToken: config.accessToken,
        }),
        chat: createTwitchChatClient({
            clientId: config.clientId,
            accessToken: config.accessToken,
        }),
    }
}
