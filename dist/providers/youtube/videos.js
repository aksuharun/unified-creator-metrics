import { PlatformApiError } from "../../errors.js";
import { YOUTUBE_PLATFORM, YOUTUBE_VIDEO_FIELDS } from "./constants.js";
import { normalizeYoutubeVideoMetrics } from "./normalize.js";
import { validateVideoMetricsRequest } from "./validation.js";
/**
 * Create video-level methods for the YouTube provider.
 */
export function createYoutubeVideosClient(options) {
    return {
        /**
     * Fetch normalized video metrics from the YouTube Data API.
     */
        async getMetrics(request) {
            validateVideoMetricsRequest(request);
            let response;
            try {
                response = await options.youtubeApiClient.videos.list({
                    part: ["snippet", "statistics", "liveStreamingDetails"],
                    id: [request.videoId],
                    fields: YOUTUBE_VIDEO_FIELDS,
                });
            }
            catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                });
            }
            const item = response.data.items?.[0];
            if (!item) {
                throw new PlatformApiError("YouTube video was not found.", {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                });
            }
            return normalizeYoutubeVideoMetrics(item, {
                includeRaw: request.includeRaw === true,
            });
        },
    };
}
function getGoogleApiErrorStatus(error) {
    if (!error || typeof error !== "object" || !("response" in error)) {
        return undefined;
    }
    const response = error.response;
    if (!response || typeof response !== "object" || !("status" in response)) {
        return undefined;
    }
    const status = Number(response.status);
    return Number.isNaN(status) ? undefined : status;
}
