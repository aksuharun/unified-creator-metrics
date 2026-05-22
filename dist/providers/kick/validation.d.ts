import type { KickChannelResolveRequest, KickClientConfig, VideoMetricsRequest } from "./types.js";
type ValidatedKickClientConfig = KickClientConfig & {
    accessToken: string;
};
export declare function validateKickConfig(config: unknown): asserts config is ValidatedKickClientConfig;
export declare function validateVideoMetricsRequest(request: unknown): asserts request is VideoMetricsRequest;
export declare function validateChannelResolveRequest(request: unknown): asserts request is KickChannelResolveRequest;
export declare function normalizeKickSlug(value: string): string;
export {};
