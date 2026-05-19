import { PlatformApiError } from "../../errors.js"
import { YOUTUBE_PLATFORM, YOUTUBE_VIDEO_FIELDS } from "./constants.js"
import type { GoogleYoutubeClient } from "./google-client.js"
import { normalizeYoutubeVideoMetrics } from "./normalize.js"
import { validateVideoMetricsRequest } from "./validation.js"
import type { VideoMetricsRequest, YoutubeVideosClient } from "./types.js"

/**
 * Dependencies required to create the YouTube video client.
 */
export type YoutubeVideosClientOptions = {
    /**
   * Official Google APIs YouTube client.
   */
    youtubeApiClient: GoogleYoutubeClient
}

/**
 * Create video-level methods for the YouTube provider.
 */
export function createYoutubeVideosClient(
    options: YoutubeVideosClientOptions,
): YoutubeVideosClient {
    return {
        /**
     * Fetch normalized video metrics from the YouTube Data API.
     */
        async getMetrics(
            request: VideoMetricsRequest,
        ): ReturnType<YoutubeVideosClient["getMetrics"]> {
            validateVideoMetricsRequest(request)

            let response

            try {
                response = await options.youtubeApiClient.videos.list({
                    part: ["snippet", "statistics", "liveStreamingDetails"],
                    id: [request.videoId],
                    fields: YOUTUBE_VIDEO_FIELDS,
                })
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }

            const item = response.data.items?.[0]

            if (!item) {
                throw new PlatformApiError("YouTube video was not found.", {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                })
            }

            return normalizeYoutubeVideoMetrics(item, {
                includeRaw: request.includeRaw === true,
            })
        },
    }
}

function getGoogleApiErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object" || !("response" in error)) {
        return undefined
    }

    const response = error.response

    if (!response || typeof response !== "object" || !("status" in response)) {
        return undefined
    }

    const status = Number(response.status)

    return Number.isNaN(status) ? undefined : status
}
