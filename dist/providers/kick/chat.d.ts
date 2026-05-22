import type { KickChatClient } from "./types.js";
type KickChatClientOptions = {
    accessToken: string;
};
/**
 * Create the Kick chat capability object exposed as `kick.chat`.
 */
export declare function createKickChatClient(options: KickChatClientOptions): KickChatClient;
export {};
