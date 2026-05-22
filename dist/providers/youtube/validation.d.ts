import type { ChannelMetricsRequest, VideoMetricsRequest, YoutubeChannelResolveRequest, YoutubeClientConfig } from "./types.js";
type ValidatedYoutubeClientConfig = YoutubeClientConfig;
export declare function validateYoutubeConfig(config: unknown): asserts config is ValidatedYoutubeClientConfig;
export declare function validateChannelMetricsRequest(request: unknown): asserts request is ChannelMetricsRequest;
export declare function validateChannelResolveRequest(request: unknown): asserts request is YoutubeChannelResolveRequest;
export declare function validateVideoMetricsRequest(request: unknown): asserts request is VideoMetricsRequest;
export declare function normalizeYoutubeHandle(value: string): string;
export {};
