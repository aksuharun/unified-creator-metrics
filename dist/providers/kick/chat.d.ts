import { type KickUserAccessTokenProvider } from "./auth.js";
import type { KickChatClient } from "./types.js";
type KickChatClientOptions = {
    appAccessToken?: string;
    userAccessToken?: string;
    userAccessTokenProvider?: KickUserAccessTokenProvider;
};
/**
 * Create the Kick chat capability object exposed as `kick.chat`.
 */
export declare function createKickChatClient(options: KickChatClientOptions): KickChatClient;
export {};
