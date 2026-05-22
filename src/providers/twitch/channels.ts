import { PlatformApiError } from "../../errors.js"
import { TWITCH_PLATFORM } from "./constants.js"
import {
    normalizeTwitchLogin,
    validateChannelMetricsRequest,
    validateChannelResolveRequest,
} from "./validation.js"
import type {
    ChannelMetricsRequest,
    TwitchChannelResolveRequest,
    TwitchChannelsClient,
} from "./types.js"

type TwitchUsersResponse = {
    data?: TwitchUser[]
}

type TwitchUser = {
    id?: string
    login?: string
    display_name?: string
}

type TwitchChannelFollowersResponse = {
    total?: number
}

export type TwitchChannelsClientOptions = {
    clientId: string
    accessToken: string
}

export function createTwitchChannelsClient(
    options: TwitchChannelsClientOptions,
): TwitchChannelsClient {
    return {
        async resolve(
            request: TwitchChannelResolveRequest,
        ): ReturnType<TwitchChannelsClient["resolve"]> {
            validateChannelResolveRequest(request)

            const login = normalizeTwitchLogin(request.login)
            const url = new URL("https://api.twitch.tv/helix/users")
            url.searchParams.append("login", login)

            let response: Response

            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${options.accessToken}`,
                        "Client-Id": options.clientId,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    cause: error,
                })
            }

            if (!response.ok) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                })
            }

            const payload = (await response.json()) as TwitchUsersResponse
            const user = payload.data?.[0]

            if (!user?.id) {
                throw new PlatformApiError("Twitch broadcaster was not found.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                })
            }

            const result = {
                platform: TWITCH_PLATFORM,
                broadcasterId: user.id,
                login: user.login ?? login,
                displayName: user.display_name ?? null,
                fetchedAt: new Date().toISOString(),
            } as const

            if (request.includeRaw === true) {
                return {
                    ...result,
                    raw: payload,
                }
            }

            return result
        },

        async getMetrics(
            request: ChannelMetricsRequest,
        ): ReturnType<TwitchChannelsClient["getMetrics"]> {
            validateChannelMetricsRequest(request)

            const url = new URL("https://api.twitch.tv/helix/channels/followers")
            url.searchParams.append("broadcaster_id", request.channelId)

            let response: Response

            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${options.accessToken}`,
                        "Client-Id": options.clientId,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    cause: error,
                })
            }

            if (!response.ok) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                })
            }

            const payload = (await response.json()) as TwitchChannelFollowersResponse

            const result = {
                platform: TWITCH_PLATFORM,
                channelId: request.channelId,
                displayName: null,
                followers:
                    typeof payload.total === "number" ? payload.total : null,
                views: null,
                fetchedAt: new Date().toISOString(),
            } as const

            if (request.includeRaw === true) {
                return {
                    ...result,
                    raw: payload,
                }
            }

            return result
        },
    }
}
