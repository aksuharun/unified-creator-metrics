export type KickUserTokenUpdate = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number | null;
    expiresAt: string | null;
    scope: string | null;
    tokenType: string | null;
};
export type KickRefreshTokenConfig = {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
};
export type KickUserAccessTokenProviderConfig = {
    accessToken?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    onTokenUpdate?: (tokens: KickUserTokenUpdate) => void | Promise<void>;
};
export type KickUserAccessTokenProvider = {
    getAccessToken(): Promise<string>;
    refreshAccessToken(): Promise<string>;
    canRefresh: boolean;
};
export declare function refreshKickAccessToken(config: KickRefreshTokenConfig): Promise<KickUserTokenUpdate>;
export declare function createKickUserAccessTokenProvider(config: KickUserAccessTokenProviderConfig): KickUserAccessTokenProvider | undefined;
