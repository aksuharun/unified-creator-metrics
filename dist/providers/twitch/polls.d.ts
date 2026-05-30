import { type TwitchUserAccessTokenProvider } from "./auth.js";
import type { TwitchPollsClient } from "./types.js";
type TwitchPollsClientOptions = {
    clientId: string;
    userAccessToken?: string;
    userAccessTokenProvider?: TwitchUserAccessTokenProvider;
};
/**
 * Create the Twitch polls capability object exposed as `twitch.polls`.
 */
export declare function createTwitchPollsClient(options: TwitchPollsClientOptions): TwitchPollsClient;
export {};
