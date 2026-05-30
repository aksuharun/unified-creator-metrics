import { YOUTUBE_PLATFORM } from "./constants.js";
export function normalizeYoutubeChannelMetrics(item, options) {
    const metrics = {
        platform: YOUTUBE_PLATFORM,
        channelId: String(item.id),
        displayName: item.snippet?.title ?? null,
        followers: parseOptionalInteger(item.statistics?.subscriberCount),
        views: parseOptionalInteger(item.statistics?.viewCount),
        fetchedAt: new Date().toISOString(),
    };
    if (options.includeRaw) {
        metrics.raw = item;
    }
    return metrics;
}
export function normalizeYoutubeVideoMetrics(item, options) {
    const metrics = {
        platform: YOUTUBE_PLATFORM,
        videoId: String(item.id),
        title: item.snippet?.title ?? null,
        channelId: item.snippet?.channelId ?? null,
        channelDisplayName: item.snippet?.channelTitle ?? null,
        likes: parseOptionalInteger(item.statistics?.likeCount),
        views: parseOptionalInteger(item.statistics?.viewCount),
        concurrentViewers: parseOptionalInteger(item.liveStreamingDetails?.concurrentViewers),
        fetchedAt: new Date().toISOString(),
    };
    if (options.includeRaw) {
        metrics.raw = item;
    }
    return metrics;
}
export function parseOptionalInteger(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
}
export function normalizeYoutubeLivestream(item, options) {
    let status = "unknown";
    const liveBroadcastContent = item.snippet?.liveBroadcastContent;
    if (liveBroadcastContent === "live") {
        status = "live";
    }
    else if (liveBroadcastContent === "upcoming") {
        status = "upcoming";
    }
    else if (liveBroadcastContent === "none") {
        status = "ended";
    }
    const livestream = {
        platform: YOUTUBE_PLATFORM,
        streamId: item.id?.videoId ?? "",
        title: item.snippet?.title ?? null,
        channelId: item.snippet?.channelId ?? null,
        channelDisplayName: item.snippet?.channelTitle ?? null,
        status,
        concurrentViewers: null,
        startedAt: item.snippet?.publishedAt ?? null,
        fetchedAt: new Date().toISOString(),
    };
    if (options.includeRaw) {
        livestream.raw = item;
    }
    return livestream;
}
