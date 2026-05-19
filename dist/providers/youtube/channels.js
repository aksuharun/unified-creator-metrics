import { PlatformApiError } from "../../errors.js";
import { YOUTUBE_CHANNEL_FIELDS, YOUTUBE_PLATFORM } from "./constants.js";
import { normalizeYoutubeChannelMetrics } from "./normalize.js";
import { validateChannelMetricsRequest } from "./validation.js";
/**
 * Create channel-level methods for the YouTube provider.
 */
export function createYoutubeChannelsClient(options) {
    return {
        /**
         * Fetch normalized channel metrics from the YouTube Data API.
         */
        async getMetrics(request) {
            validateChannelMetricsRequest(request);
            let response;
            try {
                response = await options.youtubeApiClient.channels.list({
                    part: ["snippet", "statistics"],
                    id: [request.channelId],
                    fields: YOUTUBE_CHANNEL_FIELDS,
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
                throw new PlatformApiError("YouTube channel was not found.", {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                });
            }
            return normalizeYoutubeChannelMetrics(item, {
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
