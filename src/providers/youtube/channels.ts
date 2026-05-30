import { PlatformApiError } from "../../errors.js"
import { YOUTUBE_CHANNEL_FIELDS, YOUTUBE_PLATFORM } from "./constants.js"
import type { GoogleYoutubeClient } from "./google-client.js"
import { normalizeYoutubeChannelMetrics } from "./normalize.js"
import {
    normalizeYoutubeHandle,
    validateChannelMetricsRequest,
    validateChannelResolveRequest,
} from "./validation.js"
import type {
    ChannelMetricsRequest,
    YoutubeChannelResolveRequest,
    YoutubeChannelsClient,
} from "./types.js"

/**
 * Dependencies required to create the YouTube channel client.
 */
export type YoutubeChannelsClientOptions = {
    /**
   * Official Google APIs YouTube client.
   */
    youtubeApiClient: GoogleYoutubeClient
}

/**
 * Create channel-level methods for the YouTube provider.
 */
export function createYoutubeChannelsClient(
    options: YoutubeChannelsClientOptions,
): YoutubeChannelsClient {
    return {
    /**
     * Resolve a YouTube channel id from a public handle.
     */
        async resolve(
            request: YoutubeChannelResolveRequest,
        ): ReturnType<YoutubeChannelsClient["resolve"]> {
            validateChannelResolveRequest(request)

            const handle = normalizeYoutubeHandle(request.handle)
            let response

            try {
                response = await options.youtubeApiClient.channels.list({
                    part: ["id", "snippet"],
                    forHandle: handle,
                    maxResults: 1,
                    fields: "items(id,snippet(title,thumbnails))",
                })
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }

            const item = response.data.items?.[0]

            if (!item?.id) {
                throw new PlatformApiError("YouTube channel was not found.", {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                })
            }

            const profilePictureUrl = item.snippet?.thumbnails?.high?.url ??
                item.snippet?.thumbnails?.medium?.url ??
                item.snippet?.thumbnails?.default?.url ??
                null

            const result = {
                platform: YOUTUBE_PLATFORM,
                channelId: String(item.id),
                handle,
                displayName: item.snippet?.title ?? null,
                profilePictureUrl,
                fetchedAt: new Date().toISOString(),
            } as const

            if (request.includeRaw === true) {
                return {
                    ...result,
                    raw: response.data,
                }
            }

            return result
        },

        /**
         * Fetch normalized channel metrics from the YouTube Data API.
         */
        async getMetrics(
            request: ChannelMetricsRequest,
        ): ReturnType<YoutubeChannelsClient["getMetrics"]> {
            validateChannelMetricsRequest(request)

            let response

            try {
                response = await options.youtubeApiClient.channels.list({
                    part: ["snippet", "statistics"],
                    id: [request.channelId],
                    fields: YOUTUBE_CHANNEL_FIELDS,
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
                throw new PlatformApiError("YouTube channel was not found.", {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                })
            }

            return normalizeYoutubeChannelMetrics(item, {
                includeRaw: request.includeRaw === true,
            })
        },

        /**
         * Retrieve the authenticated user's YouTube identity.
         */
        async getAuthenticatedUser(): ReturnType<YoutubeChannelsClient["getAuthenticatedUser"]> {
            let response

            try {
                response = await options.youtubeApiClient.channels.list({
                    part: ["id", "snippet"],
                    mine: true,
                    maxResults: 1,
                    fields: "items(id,snippet(title,customUrl,thumbnails))",
                })
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }

            const item = response.data.items?.[0]

            if (!item?.id) {
                throw new PlatformApiError("YouTube authenticated channel was not found.", {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                })
            }

            const profilePictureUrl = item.snippet?.thumbnails?.high?.url ??
                item.snippet?.thumbnails?.medium?.url ??
                item.snippet?.thumbnails?.default?.url ??
                null

            return {
                platform: YOUTUBE_PLATFORM,
                channelId: String(item.id),
                handle: item.snippet?.customUrl ?? "",
                displayName: item.snippet?.title ?? null,
                profilePictureUrl,
                fetchedAt: new Date().toISOString(),
            }
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
