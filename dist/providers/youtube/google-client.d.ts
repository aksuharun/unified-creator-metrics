import { type youtube_v3 } from "googleapis";
import type { YoutubeTokenRefreshResult } from "./auth.js";
export type GoogleYoutubeAuthClient = Exclude<youtube_v3.Options["auth"], string | undefined>;
/**
 * Configuration for the official Google APIs YouTube client.
 */
export type GoogleYoutubeClientConfig = {
    /**
   * YouTube Data API key.
   */
    apiKey?: string;
    /**
     * Pre-configured OAuth2 Client or auth client instance.
     */
    oauth2Client?: GoogleYoutubeAuthClient;
    /**
     * Raw OAuth 2.0 access token string.
     */
    accessToken?: string;
    /**
     * Google OAuth application client id.
     */
    clientId?: string;
    /**
     * Google OAuth application client secret.
     */
    clientSecret?: string;
    /**
     * Google OAuth refresh token used to obtain new access tokens.
     */
    refreshToken?: string;
    /**
     * Called when the internally managed OAuth2 client receives new token
     * material from Google.
     */
    onTokenUpdate?: (tokens: YoutubeTokenRefreshResult) => void | Promise<void>;
};
/**
 * Official Google APIs YouTube v3 client instance.
 */
export type GoogleYoutubeClient = youtube_v3.Youtube;
export declare function createGoogleYoutubeAuthClient(config: GoogleYoutubeClientConfig): GoogleYoutubeAuthClient | undefined;
/**
 * Create the official Google APIs YouTube client.
 */
export declare function createGoogleYoutubeClient(config: GoogleYoutubeClientConfig): GoogleYoutubeClient;
