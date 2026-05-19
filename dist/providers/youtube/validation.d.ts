import type { ChannelMetricsRequest, VideoMetricsRequest, YoutubeClientConfig } from "./types.js";
type ValidatedYoutubeClientConfig = YoutubeClientConfig & {
    apiKey: string;
};
export declare function validateYoutubeConfig(config: unknown): asserts config is ValidatedYoutubeClientConfig;
export declare function validateChannelMetricsRequest(request: unknown): asserts request is ChannelMetricsRequest;
export declare function validateVideoMetricsRequest(request: unknown): asserts request is VideoMetricsRequest;
export {};
