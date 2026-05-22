import { KICK_PLATFORM } from "./constants.js"
import type { VideoMetrics } from "./types.js"

export type KickChannelResponse = {
    data?: KickChannelItem[]
    message?: string
}

export type KickChannelItem = {
    broadcaster_user_id?: number
    slug?: string
    stream_title?: string
    stream?: {
        is_live?: boolean
        viewer_count?: number
    }
}

export function normalizeKickVideoMetrics(
    item: KickChannelItem,
    options: { includeRaw: boolean, raw: KickChannelResponse },
): VideoMetrics {
    const metrics: VideoMetrics = {
        platform: KICK_PLATFORM,
        videoId: item.slug ?? "",
        title: item.stream_title ?? null,
        channelId: stringifyOptionalValue(item.broadcaster_user_id),
        channelDisplayName: item.slug ?? null,
        likes: null,
        views: null,
        concurrentViewers: parseOptionalInteger(item.stream?.viewer_count),
        fetchedAt: new Date().toISOString(),
    }

    if (options.includeRaw) {
        metrics.raw = options.raw
    }

    return metrics
}

function stringifyOptionalValue(value: unknown): string | null {
    if (value === undefined || value === null) {
        return null
    }

    return String(value)
}

function parseOptionalInteger(value: unknown): number | null {
    if (value === undefined || value === null) {
        return null
    }

    const parsed = Number.parseInt(String(value), 10)

    return Number.isNaN(parsed) ? null : parsed
}
