import { PlatformApiError } from "../../errors.js";
import { YOUTUBE_PLATFORM } from "./constants.js";
import { normalizeYoutubeLivestream } from "./normalize.js";
import { validateActiveLivestreamsRequest, validateScheduledLivestreamsRequest, } from "./validation.js";
/**
 * Create livestream methods for the YouTube provider.
 */
export function createYoutubeLivestreamsClient(options) {
    return {
        /**
         * Fetch active (currently live) streams for a channel.
         */
        async getActive(request) {
            validateActiveLivestreamsRequest(request);
            let response;
            try {
                response = await options.youtubeApiClient.search.list({
                    part: ["snippet"],
                    channelId: request.channelId,
                    type: ["video"],
                    eventType: "live",
                });
            }
            catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                });
            }
            const items = response.data.items ?? [];
            const includeRaw = request.includeRaw === true;
            return items.map((item) => normalizeYoutubeLivestream(item, { includeRaw }));
        },
        /**
         * Fetch scheduled (upcoming) streams for a channel.
         */
        async getScheduled(request) {
            validateScheduledLivestreamsRequest(request);
            let response;
            try {
                response = await options.youtubeApiClient.search.list({
                    part: ["snippet"],
                    channelId: request.channelId,
                    type: ["video"],
                    eventType: "upcoming",
                });
            }
            catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                });
            }
            const items = response.data.items ?? [];
            const includeRaw = request.includeRaw === true;
            return items.map((item) => normalizeYoutubeLivestream(item, { includeRaw }));
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
