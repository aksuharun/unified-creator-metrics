import type { ChannelMetric, VideoMetric } from "../../types.js"

export const TWITCH_PLATFORM = "twitch"

export const SUPPORTED_TWITCH_CHANNEL_METRICS: ReadonlySet<ChannelMetric> =
    new Set(["followers"])

export const SUPPORTED_TWITCH_VIDEO_METRICS: ReadonlySet<VideoMetric> = new Set([
    "concurrentViewers",
])
