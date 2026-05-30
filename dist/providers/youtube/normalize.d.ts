import type { youtube_v3 } from "googleapis";
import type { ChannelMetrics, VideoMetrics } from "./types.js";
import type { Livestream } from "../../types.js";
export declare function normalizeYoutubeChannelMetrics(item: youtube_v3.Schema$Channel, options: {
    includeRaw: boolean;
}): ChannelMetrics;
export declare function normalizeYoutubeVideoMetrics(item: youtube_v3.Schema$Video, options: {
    includeRaw: boolean;
}): VideoMetrics;
export declare function parseOptionalInteger(value: unknown): number | null;
export declare function normalizeYoutubeLivestream(item: youtube_v3.Schema$SearchResult, options: {
    includeRaw: boolean;
}): Livestream<"youtube">;
