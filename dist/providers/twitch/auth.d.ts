export type TwitchUserTokenUpdate = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number | null;
    expiresAt: string | null;
    scope: string[];
    tokenType: string | null;
};
export type TwitchRefreshTokenConfig = {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
};
export type TwitchUserAccessTokenProviderConfig = {
    accessToken?: string;
    clientId: string;
    clientSecret?: string;
    refreshToken?: string;
    onTokenUpdate?: (tokens: TwitchUserTokenUpdate) => void | Promise<void>;
};
export type TwitchUserAccessTokenProvider = {
    getAccessToken(): Promise<string>;
    refreshAccessToken(): Promise<string>;
    canRefresh: boolean;
};
export declare function refreshTwitchAccessToken(config: TwitchRefreshTokenConfig): Promise<TwitchUserTokenUpdate>;
export declare function createTwitchUserAccessTokenProvider(config: TwitchUserAccessTokenProviderConfig): TwitchUserAccessTokenProvider | undefined;
