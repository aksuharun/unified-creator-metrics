import { type TwitchUserAccessTokenProvider } from "./auth.js";
import type { TwitchChannelsClient } from "./types.js";
export type TwitchChannelsClientOptions = {
    clientId: string;
    appAccessToken?: string;
    userAccessToken?: string;
    userAccessTokenProvider?: TwitchUserAccessTokenProvider;
};
export declare function createTwitchChannelsClient(options: TwitchChannelsClientOptions): TwitchChannelsClient;
