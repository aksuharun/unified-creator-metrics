import type { TwitchUserAccessTokenProvider } from "./auth.js";
import type { TwitchVideosClient } from "./types.js";
export type TwitchVideosClientOptions = {
    clientId: string;
    appAccessToken?: string;
    userAccessTokenProvider?: TwitchUserAccessTokenProvider;
};
export declare function createTwitchVideosClient(options: TwitchVideosClientOptions): TwitchVideosClient;
