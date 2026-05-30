import { PlatformApiError } from "../../errors.js"
import { YOUTUBE_PLATFORM } from "./constants.js"
import type { GoogleYoutubeClient } from "./google-client.js"
import { normalizeYoutubeLivestream } from "./normalize.js"
import {
    validateActiveLivestreamsRequest,
    validateScheduledLivestreamsRequest,
} from "./validation.js"
import type {
    YoutubeActiveLivestreamsRequest,
    YoutubeScheduledLivestreamsRequest,
    YoutubeLivestreamsClient,
} from "./types.js"

/**
 * Dependencies required to create the YouTube livestreams client.
 */
export type YoutubeLivestreamsClientOptions = {
    /**
     * Official Google APIs YouTube client.
     */
    youtubeApiClient: GoogleYoutubeClient
}

/**
 * Create livestream methods for the YouTube provider.
 */
export function createYoutubeLivestreamsClient(
    options: YoutubeLivestreamsClientOptions,
): YoutubeLivestreamsClient {
    return {
        /**
         * Fetch active (currently live) streams for a channel.
         */
        async getActive(
            request: YoutubeActiveLivestreamsRequest,
        ): ReturnType<YoutubeLivestreamsClient["getActive"]> {
            validateActiveLivestreamsRequest(request)

            let response

            try {
                response = await options.youtubeApiClient.search.list({
                    part: ["snippet"],
                    channelId: request.channelId,
                    type: ["video"],
                    eventType: "live",
                })
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }

            const items = response.data.items ?? []
            const includeRaw = request.includeRaw === true

            return items.map((item) => normalizeYoutubeLivestream(item, { includeRaw }))
        },

        /**
         * Fetch scheduled (upcoming) streams for a channel.
         */
        async getScheduled(
            request: YoutubeScheduledLivestreamsRequest,
        ): ReturnType<YoutubeLivestreamsClient["getScheduled"]> {
            validateScheduledLivestreamsRequest(request)

            let response

            try {
                response = await options.youtubeApiClient.search.list({
                    part: ["snippet"],
                    channelId: request.channelId,
                    type: ["video"],
                    eventType: "upcoming",
                })
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }

            const items = response.data.items ?? []
            const includeRaw = request.includeRaw === true

            return items.map((item) => normalizeYoutubeLivestream(item, { includeRaw }))
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
