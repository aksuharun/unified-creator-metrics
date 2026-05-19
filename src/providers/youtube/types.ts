import type {
    ChannelMetrics as SharedChannelMetrics,
    ChannelMetricsRequest as SharedChannelMetricsRequest,
    VideoMetrics as SharedVideoMetrics,
    VideoMetricsRequest as SharedVideoMetricsRequest,
} from "../../types.js"

/**
 * Configuration required to create a YouTube provider client.
 */
export type YoutubeClientConfig = {
    /**
   * YouTube Data API key.
   */
    apiKey: string | undefined
}

/**
 * YouTube-supported public channel metrics.
 */
export type YoutubeChannelMetric = "followers" | "views"

/**
 * YouTube-supported public video metrics.
 */
export type YoutubeVideoMetric = "likes" | "views" | "concurrentViewers"

export type ChannelMetricsRequest = Omit<SharedChannelMetricsRequest, "metrics"> & {
    metrics: YoutubeChannelMetric[]
}

/**
 * Normalized channel metrics returned by the YouTube provider.
 */
export type ChannelMetrics = SharedChannelMetrics<"youtube">

export type VideoMetricsRequest = Omit<SharedVideoMetricsRequest, "metrics"> & {
    metrics: YoutubeVideoMetric[]
}

/**
 * Normalized video metrics returned by the YouTube provider.
 */
export type VideoMetrics = SharedVideoMetrics<"youtube">

/**
 * YouTube channel metric methods.
 */
export type YoutubeChannelsClient = {
    /**
   * Fetch normalized channel metrics from the YouTube Data API.
   */
    getMetrics(request: ChannelMetricsRequest): Promise<ChannelMetrics>
}

/**
 * YouTube video metric methods.
 */
export type YoutubeVideosClient = {
    /**
   * Fetch normalized video metrics from the YouTube Data API.
   */
    getMetrics(request: VideoMetricsRequest): Promise<VideoMetrics>
}

/**
 * YouTube provider client.
 */
export type YoutubeClient = {
    /**
   * Client platform identifier.
   */
    platform: "youtube"

    /**
   * Channel-related methods.
   */
    channels: YoutubeChannelsClient

    /**
   * Video-related methods.
   */
    videos: YoutubeVideosClient
}
