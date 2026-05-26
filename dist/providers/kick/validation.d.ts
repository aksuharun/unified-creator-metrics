import type { KickChannelResolveRequest, KickClientConfig, VideoMetricsRequest } from "./types.js";
type ValidatedKickClientConfig = KickClientConfig & ({
    appAccessToken: string;
} | {
    userAccessToken: string;
} | {
    userRefreshToken: string;
} | {
    accessToken: string;
});
export declare function validateKickConfig(config: unknown): asserts config is ValidatedKickClientConfig;
export declare function resolveKickClientTokens(config: KickClientConfig): {
    appAccessToken?: string;
    userAccessToken?: string;
};
export declare function requireKickAppAccessToken(appAccessToken: string | undefined, feature: string): string;
export declare function requireKickUserAccessToken(userAccessToken: string | undefined, feature: string): string;
export declare function validateVideoMetricsRequest(request: unknown): asserts request is VideoMetricsRequest;
export declare function validateChannelResolveRequest(request: unknown): asserts request is KickChannelResolveRequest;
export declare function normalizeKickSlug(value: string): string;
export {};
