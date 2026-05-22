import { KICK_PLATFORM } from "./constants.js";
export function normalizeKickVideoMetrics(item, options) {
    const metrics = {
        platform: KICK_PLATFORM,
        videoId: item.slug ?? "",
        title: item.stream_title ?? null,
        channelId: stringifyOptionalValue(item.broadcaster_user_id),
        channelDisplayName: item.slug ?? null,
        likes: null,
        views: null,
        concurrentViewers: parseOptionalInteger(item.stream?.viewer_count),
        fetchedAt: new Date().toISOString(),
    };
    if (options.includeRaw) {
        metrics.raw = options.raw;
    }
    return metrics;
}
function stringifyOptionalValue(value) {
    if (value === undefined || value === null) {
        return null;
    }
    return String(value);
}
function parseOptionalInteger(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
}
