import type { TwitchUserAccessTokenProvider } from "./auth.js";
import type { TwitchLivestreamsClient } from "./types.js";
export type TwitchLivestreamsClientOptions = {
    clientId: string;
    appAccessToken?: string;
    userAccessTokenProvider?: TwitchUserAccessTokenProvider;
};
export declare function createTwitchLivestreamsClient(options: TwitchLivestreamsClientOptions): TwitchLivestreamsClient;
