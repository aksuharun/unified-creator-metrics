import type { youtube_v3 } from "googleapis"
import { YOUTUBE_PLATFORM } from "./constants.js"
import type { ChannelMetrics, VideoMetrics } from "./types.js"
import type { Livestream } from "../../types.js"

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

export function normalizeYoutubeLivestream(
    item: youtube_v3.Schema$SearchResult,
    options: { includeRaw: boolean },
): Livestream<"youtube"> {
    let status: "live" | "upcoming" | "ended" | "unknown" = "unknown"
    const liveBroadcastContent = item.snippet?.liveBroadcastContent
    if (liveBroadcastContent === "live") {
        status = "live"
    } else if (liveBroadcastContent === "upcoming") {
        status = "upcoming"
    } else if (liveBroadcastContent === "none") {
        status = "ended"
    }

    const livestream: Livestream<"youtube"> = {
        platform: YOUTUBE_PLATFORM,
        streamId: item.id?.videoId ?? "",
        title: item.snippet?.title ?? null,
        channelId: item.snippet?.channelId ?? null,
        channelDisplayName: item.snippet?.channelTitle ?? null,
        status,
        concurrentViewers: null,
        startedAt: item.snippet?.publishedAt ?? null,
        fetchedAt: new Date().toISOString(),
    }

    if (options.includeRaw) {
        livestream.raw = item
    }

    return livestream
}
