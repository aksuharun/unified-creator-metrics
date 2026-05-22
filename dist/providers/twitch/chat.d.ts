import type { TwitchChatClient } from "./types.js";
type TwitchChatClientOptions = {
    clientId: string;
    accessToken: string;
};
/**
 * Create the Twitch chat capability object exposed as `twitch.chat`.
 */
export declare function createTwitchChatClient(options: TwitchChatClientOptions): TwitchChatClient;
export {};
