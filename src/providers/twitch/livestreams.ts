import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import type { TwitchUserAccessTokenProvider } from "./auth.js"
import { TWITCH_PLATFORM } from "./constants.js"
import {
    validateActiveLivestreamsRequest,
    validateScheduledLivestreamsRequest,
} from "./validation.js"
import type {
    TwitchActiveLivestreamsRequest,
    TwitchScheduledLivestreamsRequest,
    TwitchLivestreamsClient,
} from "./types.js"


type TwitchStream = {
    id?: string
    user_id?: string
    user_login?: string
    user_name?: string
    title?: string
    viewer_count?: number
    started_at?: string
}

type TwitchStreamsResponse = {
    data?: TwitchStream[]
}

type TwitchScheduleSegment = {
    id: string
    start_time: string
    end_time: string
    title: string
    canceled_until: string | null
    category: {
        id: string
        name: string
    } | null
    is_recurring: boolean
}

type TwitchScheduleResponse = {
    data?: {
        segments: TwitchScheduleSegment[] | null
        broadcaster_id: string
        broadcaster_name: string
        broadcaster_login: string
    }
}

export type TwitchLivestreamsClientOptions = {
    clientId: string
    appAccessToken?: string
    userAccessTokenProvider?: TwitchUserAccessTokenProvider
}

export function createTwitchLivestreamsClient(
    options: TwitchLivestreamsClientOptions,
): TwitchLivestreamsClient {
    return {
        /**
         * Fetch active (currently live) streams for a Twitch broadcaster.
         */
        async getActive(
            request: TwitchActiveLivestreamsRequest,
        ): ReturnType<TwitchLivestreamsClient["getActive"]> {
            validateActiveLivestreamsRequest(request)

            const { accessToken, accessTokenProvider } =
                await resolveTwitchLivestreamAccessToken(options, "livestreams.getActive()")

            const url = new URL("https://api.twitch.tv/helix/streams")
            url.searchParams.append("user_id", request.channelId)

            const response = await twitchApiFetch(url, {
                clientId: options.clientId,
                accessToken,
                accessTokenProvider,
            })

            const payload = (await response.json()) as TwitchStreamsResponse
            const streams = payload.data ?? []
            const includeRaw = request.includeRaw === true

            return streams.map((stream) => ({
                platform: TWITCH_PLATFORM,
                streamId: stream.id ?? "",
                title: stream.title ?? null,
                channelId: stream.user_id ?? request.channelId,
                channelDisplayName: stream.user_name ?? null,
                status: "live",
                concurrentViewers:
                    typeof stream.viewer_count === "number"
                        ? stream.viewer_count
                        : null,
                startedAt: stream.started_at ?? null,
                fetchedAt: new Date().toISOString(),
                ...(includeRaw ? { raw: stream } : {}),
            }))
        },

        /**
         * Fetch scheduled (upcoming) streams for a Twitch broadcaster.
         */
        async getScheduled(
            request: TwitchScheduledLivestreamsRequest,
        ): ReturnType<TwitchLivestreamsClient["getScheduled"]> {
            validateScheduledLivestreamsRequest(request)

            const { accessToken, accessTokenProvider } =
                await resolveTwitchLivestreamAccessToken(options, "livestreams.getScheduled()")

            const url = new URL("https://api.twitch.tv/helix/schedule")
            url.searchParams.append("broadcaster_id", request.channelId)

            let response
            try {
                response = await twitchApiFetch(url, {
                    clientId: options.clientId,
                    accessToken,
                    accessTokenProvider,
                })
            } catch (error) {
                // If Twitch returns a 404 schedule not found, it means the broadcaster has no schedule.
                // We should return an empty array instead of throwing.
                if (error instanceof PlatformApiError && error.status === 404) {
                    return []
                }
                throw error
            }

            const payload = (await response.json()) as TwitchScheduleResponse
            const broadcasterId = payload.data?.broadcaster_id ?? request.channelId
            const broadcasterName = payload.data?.broadcaster_name ?? null
            const segments = payload.data?.segments ?? []
            const includeRaw = request.includeRaw === true

            return segments.map((segment) => ({
                platform: TWITCH_PLATFORM,
                streamId: segment.id,
                title: segment.title ?? null,
                channelId: broadcasterId,
                channelDisplayName: broadcasterName,
                status: segment.canceled_until ? "ended" : "upcoming",
                concurrentViewers: null,
                startedAt: segment.start_time ?? null,
                fetchedAt: new Date().toISOString(),
                ...(includeRaw ? { raw: segment } : {}),
            }))
        },
    }
}

async function resolveTwitchLivestreamAccessToken(
    options: TwitchLivestreamsClientOptions,
    feature: string,
): Promise<{
    accessToken: string
    accessTokenProvider?: TwitchUserAccessTokenProvider
}> {
    if (options.appAccessToken) {
        return {
            accessToken: options.appAccessToken,
        }
    }

    if (options.userAccessTokenProvider) {
        return {
            accessToken: await options.userAccessTokenProvider.getAccessToken(),
            accessTokenProvider: options.userAccessTokenProvider,
        }
    }

    throw new PlatformValidationError(
        `Twitch appAccessToken or userAccessToken is required for Twitch ${feature}.`,
        {
            platform: TWITCH_PLATFORM,
        },
    )
}

async function twitchApiFetch(
    url: URL,
    options: {
        clientId: string
        accessToken: string
        accessTokenProvider?: TwitchUserAccessTokenProvider
    },
): Promise<Response> {
    const runRequest = async (accessToken: string): Promise<Response> => {
        try {
            return await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Client-Id": options.clientId,
                },
            })
        } catch (error) {
            throw new PlatformApiError("Twitch API request failed.", {
                platform: TWITCH_PLATFORM,
                cause: error,
            })
        }
    }

    let response = await runRequest(options.accessToken)

    if (response.status === 401 && options.accessTokenProvider?.canRefresh) {
        response = await runRequest(
            await options.accessTokenProvider.refreshAccessToken(),
        )
    }

    if (!response.ok) {
        throw new PlatformApiError("Twitch API request failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
        })
    }

    return response
}
