export type YoutubeRefreshTokenConfig = {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
};
export type YoutubeTokenRefreshResult = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number | null;
    expiresAt: string | null;
    scope: string | null;
    tokenType: string | null;
};
export declare function refreshYoutubeAccessToken(config: YoutubeRefreshTokenConfig): Promise<YoutubeTokenRefreshResult>;
