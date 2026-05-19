export const YOUTUBE_PLATFORM = "youtube";
export const SUPPORTED_YOUTUBE_CHANNEL_METRICS = new Set(["followers", "views"]);
export const SUPPORTED_YOUTUBE_VIDEO_METRICS = new Set(["likes", "views", "concurrentViewers"]);
export const YOUTUBE_CHANNEL_FIELDS = "items(id,snippet(title),statistics(subscriberCount,hiddenSubscriberCount,viewCount))";
export const YOUTUBE_VIDEO_FIELDS = "items(id,snippet(title,channelId,channelTitle),statistics(viewCount,likeCount),liveStreamingDetails(concurrentViewers))";
