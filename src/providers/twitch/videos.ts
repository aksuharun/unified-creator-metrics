import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import type { TwitchUserAccessTokenProvider } from "./auth.js"
import { TWITCH_PLATFORM } from "./constants.js"
import { validateVideoMetricsRequest } from "./validation.js"
import type { TwitchVideosClient, VideoMetricsRequest } from "./types.js"

type TwitchStream = {
    id?: string
    user_id?: string
    user_login?: string
    user_name?: string
    title?: string
    viewer_count?: number
}

type TwitchStreamsResponse = {
    data?: TwitchStream[]
}

export type TwitchVideosClientOptions = {
    clientId: string
    appAccessToken?: string
    userAccessTokenProvider?: TwitchUserAccessTokenProvider
}

export function createTwitchVideosClient(
    options: TwitchVideosClientOptions,
): TwitchVideosClient {
    return {
        async getMetrics(
            request: VideoMetricsRequest,
        ): ReturnType<TwitchVideosClient["getMetrics"]> {
            validateVideoMetricsRequest(request)

            const { accessToken, accessTokenProvider } =
                await resolveTwitchVideoAccessToken(options)

            const url = new URL("https://api.twitch.tv/helix/streams")
            url.searchParams.append("user_id", request.videoId)

            const response = await twitchApiFetch(url, {
                clientId: options.clientId,
                accessToken,
                accessTokenProvider,
            })

            const payload = (await response.json()) as TwitchStreamsResponse
            const stream = payload.data?.[0]

            return {
                platform: TWITCH_PLATFORM,
                videoId: request.videoId,
                title: stream?.title ?? null,
                channelId: stream?.user_id ?? request.videoId,
                channelDisplayName: stream?.user_name ?? null,
                likes: null,
                views: null,
                concurrentViewers:
                    typeof stream?.viewer_count === "number"
                        ? stream.viewer_count
                        : null,
                fetchedAt: new Date().toISOString(),
                ...(request.includeRaw === true ? { raw: payload } : {}),
            }
        },
    }
}

async function resolveTwitchVideoAccessToken(
    options: TwitchVideosClientOptions,
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
        "Twitch appAccessToken or userAccessToken is required for videos.getMetrics().",
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
