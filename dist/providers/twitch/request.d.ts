import type { TwitchUserAccessTokenProvider } from "./auth.js";
declare const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix";
export type TwitchValidatedUserToken = {
    userId: string;
    login: string | null;
};
export { TWITCH_API_BASE_URL };
/**
 * Validate a Twitch user token and ensure it includes the required scopes.
 */
export declare function validateTwitchUserAccessToken(options: {
    clientId: string;
    userAccessTokenProvider: TwitchUserAccessTokenProvider;
}, requirements: {
    feature: string;
    requiredScopes: readonly string[];
}): Promise<TwitchValidatedUserToken>;
/**
 * Send an authorized request to the Twitch API and normalize transport failures.
 */
export declare function twitchRequest<TPayload>(options: {
    clientId: string;
    userAccessTokenProvider: TwitchUserAccessTokenProvider;
}, pathOrUrl: string | URL, init?: RequestInit): Promise<TPayload>;
export declare function requireTwitchUserAccessTokenProvider(provider: TwitchUserAccessTokenProvider | undefined, feature: string): TwitchUserAccessTokenProvider;
export declare function runTwitchAuthorizedRequest(provider: TwitchUserAccessTokenProvider, runRequest: (accessToken: string) => Promise<Response>): Promise<Response>;
