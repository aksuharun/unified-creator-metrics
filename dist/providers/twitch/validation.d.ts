import type { ChannelMetricsRequest, VideoMetricsRequest, TwitchChannelResolveRequest, TwitchClientConfig, TwitchActiveLivestreamsRequest, TwitchScheduledLivestreamsRequest } from "./types.js";
type ValidatedTwitchClientConfig = TwitchClientConfig & {
    clientId: string;
} & ({
    appAccessToken: string;
} | {
    userAccessToken: string;
} | {
    userRefreshToken: string;
} | {
    accessToken: string;
});
export declare function validateTwitchConfig(config: unknown): asserts config is ValidatedTwitchClientConfig;
export declare function resolveTwitchClientTokens(config: TwitchClientConfig): {
    appAccessToken?: string;
    userAccessToken?: string;
};
export declare function requireTwitchResolveAccessToken(options: {
    appAccessToken?: string;
    userAccessToken?: string;
}, feature: string): string;
export declare function requireTwitchUserAccessToken(userAccessToken: string | undefined, feature: string): string;
export declare function validateChannelResolveRequest(request: unknown): asserts request is TwitchChannelResolveRequest;
export declare function validateChannelMetricsRequest(request: unknown): asserts request is ChannelMetricsRequest;
export declare function validateVideoMetricsRequest(request: unknown): asserts request is VideoMetricsRequest;
export declare function normalizeTwitchLogin(value: string): string;
export declare function validateActiveLivestreamsRequest(request: unknown): asserts request is TwitchActiveLivestreamsRequest;
export declare function validateScheduledLivestreamsRequest(request: unknown): asserts request is TwitchScheduledLivestreamsRequest;
export {};
