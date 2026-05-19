import type { ChannelMetric, VideoMetric } from "../../types.js";
export declare const YOUTUBE_PLATFORM = "youtube";
export declare const SUPPORTED_YOUTUBE_CHANNEL_METRICS: ReadonlySet<ChannelMetric>;
export declare const SUPPORTED_YOUTUBE_VIDEO_METRICS: ReadonlySet<VideoMetric>;
export declare const YOUTUBE_CHANNEL_FIELDS = "items(id,snippet(title),statistics(subscriberCount,hiddenSubscriberCount,viewCount))";
export declare const YOUTUBE_VIDEO_FIELDS = "items(id,snippet(title,channelId,channelTitle),statistics(viewCount,likeCount),liveStreamingDetails(concurrentViewers))";
