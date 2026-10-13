import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { YOUTUBE_PLATFORM } from "./constants.js"
import type { GoogleYoutubeClient } from "./google-client.js"
import {
    normalizeYoutubeAuthenticatedChannelLivestream,
    normalizeYoutubeLivestream,
} from "./normalize.js"
import {
    validateActiveLivestreamsRequest,
    validateAuthenticatedChannelLivestreamsRequest,
    validateScheduledLivestreamsRequest,
} from "./validation.js"
import type {
    YoutubeActiveLivestreamsRequest,
    YoutubeAuthenticatedChannelLivestreamsRequest,
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

    /**
     * Whether the configured YouTube client can act on behalf of an authenticated channel.
     */
    hasAuthenticatedAccess: boolean
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

        /**
         * Fetch active (currently live) streams for the authenticated YouTube channel.
         */
        async getAuthenticatedChannelActive(
            request?: YoutubeAuthenticatedChannelLivestreamsRequest,
        ): ReturnType<YoutubeLivestreamsClient["getAuthenticatedChannelActive"]> {
            return listAuthenticatedChannelLivestreams(
                options,
                "active",
                request,
                "livestreams.getAuthenticatedChannelActive()",
            )
        },

        /**
         * Fetch scheduled (upcoming) streams for the authenticated YouTube channel.
         */
        async getAuthenticatedChannelScheduled(
            request?: YoutubeAuthenticatedChannelLivestreamsRequest,
        ): ReturnType<YoutubeLivestreamsClient["getAuthenticatedChannelScheduled"]> {
            return listAuthenticatedChannelLivestreams(
                options,
                "upcoming",
                request,
                "livestreams.getAuthenticatedChannelScheduled()",
            )
        },
    }
}

async function listAuthenticatedChannelLivestreams(
    options: YoutubeLivestreamsClientOptions,
    broadcastStatus: "active" | "upcoming",
    request: YoutubeAuthenticatedChannelLivestreamsRequest | undefined,
    feature: string,
): ReturnType<YoutubeLivestreamsClient["getAuthenticatedChannelActive"]> {
    validateAuthenticatedChannelLivestreamsRequest(request)
    requireYoutubeAuthenticatedAccess(options.hasAuthenticatedAccess, feature)

    let response

    try {
        response = await options.youtubeApiClient.liveBroadcasts.list({
            part: ["id", "snippet", "status"],
            broadcastStatus,
            broadcastType: "all",
            fields:
                "items(id,snippet(channelId,title,publishedAt,scheduledStartTime,actualStartTime),status(lifeCycleStatus))",
        })
    } catch (error) {
        throw new PlatformApiError("YouTube API request failed.", {
            platform: YOUTUBE_PLATFORM,
            status: getGoogleApiErrorStatus(error),
            cause: error,
        })
    }

    const items = response.data.items ?? []
    const includeRaw = request?.includeRaw === true

    return items.map((item) =>
        normalizeYoutubeAuthenticatedChannelLivestream(item, { includeRaw }),
    )
}

function requireYoutubeAuthenticatedAccess(
    hasAuthenticatedAccess: boolean,
    feature: string,
): void {
    if (hasAuthenticatedAccess) {
        return
    }

    throw new PlatformValidationError(
        `YouTube accessToken, oauth2Client, or refreshToken is required for ${feature}.`,
        {
            platform: YOUTUBE_PLATFORM,
        },
    )
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
