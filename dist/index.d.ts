export { PlatformApiError, PlatformValidationError } from "./errors.js";
export { createMultiPlatformClient } from "./multi-platform.js";
export { createGoogleYoutubeClient, createYoutubeClient } from "./youtube.js";
export type { ChannelMetric, ChannelMetrics, ChannelMetricsRequest, Platform as PlatformName, VideoMetric, VideoMetrics, VideoMetricsRequest, } from "./types.js";
export type { YoutubeChannelsClient, YoutubeChannelMetric, YoutubeClient, YoutubeClientConfig, YoutubeVideoMetric, YoutubeVideosClient, } from "./providers/youtube/types.js";
/**
 * Runtime constants for callers who prefer enum-like values over string literals.
 */
export declare const Platform: Readonly<{
    readonly YouTube: "youtube";
    readonly Twitch: "twitch";
    readonly Kick: "kick";
}>;
