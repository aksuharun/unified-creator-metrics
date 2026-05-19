/**
 * Supported platform identifiers for the normalized library surface.
 */
export type Platform = "youtube" | "twitch" | "kick";
/**
 * Normalized public channel metrics used across every provider client.
 *
 * Provider clients map these names to their native fields internally. For
 * example, YouTube maps `followers` to `subscriberCount`.
 */
export type ChannelMetric = "followers" | "views";
/**
 * Request for normalized channel metrics.
 */
export type ChannelMetricsRequest = {
    /**
   * Provider-specific channel id.
   */
    channelId: string;
    /**
   * Normalized metrics to fetch.
   */
    metrics: ChannelMetric[];
    /**
   * Include the provider raw response when supported.
   */
    includeRaw?: boolean;
};
/**
 * Normalized public video metrics used across every provider client.
 */
export type VideoMetric = "likes" | "views" | "concurrentViewers";
/**
 * Request for normalized video metrics.
 */
export type VideoMetricsRequest = {
    /**
   * Provider-specific video id.
   */
    videoId: string;
    /**
   * Normalized metrics to fetch.
   */
    metrics: VideoMetric[];
    /**
   * Include the provider raw response when supported.
   */
    includeRaw?: boolean;
};
/**
 * Normalized channel metrics returned by a provider.
 */
export type ChannelMetrics<TPlatform extends Platform = Platform> = {
    /**
   * Source platform identifier.
   */
    platform: TPlatform;
    /**
   * Provider-specific channel id.
   */
    channelId: string;
    /**
   * Human-readable channel name when available.
   */
    displayName: string | null;
    /**
   * Normalized follower count.
   */
    followers: number | null;
    /**
   * Normalized view count when available.
   */
    views: number | null;
    /**
   * ISO timestamp for when the metric was normalized.
   */
    fetchedAt: string;
    /**
   * Raw provider response, only present when `includeRaw` is true.
     */
    raw?: unknown;
};
/**
 * Normalized video metrics returned by a provider.
 */
export type VideoMetrics<TPlatform extends Platform = Platform> = {
    /**
   * Source platform identifier.
   */
    platform: TPlatform;
    /**
   * Provider-specific video id.
   */
    videoId: string;
    /**
   * Human-readable video title when available.
   */
    title: string | null;
    /**
   * Provider-specific channel id when available.
   */
    channelId: string | null;
    /**
   * Human-readable channel name when available.
   */
    channelDisplayName: string | null;
    /**
   * Normalized like count.
   */
    likes: number | null;
    /**
   * Normalized view count.
   */
    views: number | null;
    /**
   * Normalized concurrent viewer count for livestreams.
   */
    concurrentViewers: number | null;
    /**
   * ISO timestamp for when the metric was normalized.
   */
    fetchedAt: string;
    /**
   * Raw provider response, only present when `includeRaw` is true.
   */
    raw?: unknown;
};
