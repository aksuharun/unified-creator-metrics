import type { VideoMetric } from "../../types.js"

export const KICK_PLATFORM = "kick"

export const SUPPORTED_KICK_VIDEO_METRICS: ReadonlySet<VideoMetric> = new Set([
    "concurrentViewers",
])
