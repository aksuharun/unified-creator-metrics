import type { KickUserAccessTokenProvider } from "./auth.js";
import type { KickChannelsClient } from "./types.js";
export type KickChannelsClientOptions = {
    appAccessToken?: string;
    userAccessTokenProvider?: KickUserAccessTokenProvider;
};
export declare function createKickChannelsClient(options: KickChannelsClientOptions): KickChannelsClient;
