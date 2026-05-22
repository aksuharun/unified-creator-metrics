import type { VideoMetrics } from "./types.js";
export type KickChannelResponse = {
    data?: KickChannelItem[];
    message?: string;
};
export type KickChannelItem = {
    broadcaster_user_id?: number;
    slug?: string;
    stream_title?: string;
    stream?: {
        is_live?: boolean;
        viewer_count?: number;
    };
};
export declare function normalizeKickVideoMetrics(item: KickChannelItem, options: {
    includeRaw: boolean;
    raw: KickChannelResponse;
}): VideoMetrics;
