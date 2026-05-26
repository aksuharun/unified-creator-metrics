import { type TwitchUserAccessTokenProvider } from "./auth.js";
import type { TwitchChatClient } from "./types.js";
type TwitchChatClientOptions = {
    clientId: string;
    userAccessToken?: string;
    userAccessTokenProvider?: TwitchUserAccessTokenProvider;
};
/**
 * Create the Twitch chat capability object exposed as `twitch.chat`.
 */
export declare function createTwitchChatClient(options: TwitchChatClientOptions): TwitchChatClient;
export {};
