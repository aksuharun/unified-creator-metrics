import type { ChannelMetricsRequest, TwitchChannelResolveRequest, TwitchClientConfig } from "./types.js";
type ValidatedTwitchClientConfig = TwitchClientConfig & {
    clientId: string;
    accessToken: string;
};
export declare function validateTwitchConfig(config: unknown): asserts config is ValidatedTwitchClientConfig;
export declare function validateChannelResolveRequest(request: unknown): asserts request is TwitchChannelResolveRequest;
export declare function validateChannelMetricsRequest(request: unknown): asserts request is ChannelMetricsRequest;
export declare function normalizeTwitchLogin(value: string): string;
export {};
