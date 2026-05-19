import type { youtube_v3 } from "googleapis"
import { YOUTUBE_PLATFORM } from "./constants.js"
import type { ChannelMetrics, VideoMetrics } from "./types.js"

export function normalizeYoutubeChannelMetrics(
    item: youtube_v3.Schema$Channel,
    options: { includeRaw: boolean },
): ChannelMetrics {
    const metrics: ChannelMetrics = {
        platform: YOUTUBE_PLATFORM,
        channelId: String(item.id),
        displayName: item.snippet?.title ?? null,
        followers: parseOptionalInteger(item.statistics?.subscriberCount),
        views: parseOptionalInteger(item.statistics?.viewCount),
        fetchedAt: new Date().toISOString(),
    }

    if (options.includeRaw) {
        metrics.raw = item
    }

    return metrics
}

export function normalizeYoutubeVideoMetrics(
    item: youtube_v3.Schema$Video,
    options: { includeRaw: boolean },
): VideoMetrics {
    const metrics: VideoMetrics = {
        platform: YOUTUBE_PLATFORM,
        videoId: String(item.id),
        title: item.snippet?.title ?? null,
        channelId: item.snippet?.channelId ?? null,
        channelDisplayName: item.snippet?.channelTitle ?? null,
        likes: parseOptionalInteger(item.statistics?.likeCount),
        views: parseOptionalInteger(item.statistics?.viewCount),
        concurrentViewers: parseOptionalInteger(
            item.liveStreamingDetails?.concurrentViewers,
        ),
        fetchedAt: new Date().toISOString(),
    }

    if (options.includeRaw) {
        metrics.raw = item
    }

    return metrics
}

export function parseOptionalInteger(value: unknown): number | null {
    if (value === undefined || value === null) {
        return null
    }

    const parsed = Number.parseInt(String(value), 10)

    return Number.isNaN(parsed) ? null : parsed
}
