import { PlatformApiError } from "../../errors.js"
import { KICK_PLATFORM } from "./constants.js"
import type { KickChannelResponse } from "./normalize.js"
import {
    normalizeKickSlug,
    requireKickAppAccessToken,
    validateChannelResolveRequest,
} from "./validation.js"
import type {
    KickChannelResolveRequest,
    KickChannelsClient,
} from "./types.js"

export type KickChannelsClientOptions = {
    appAccessToken?: string
}

export function createKickChannelsClient(
    options: KickChannelsClientOptions,
): KickChannelsClient {
    return {
        async resolve(
            request: KickChannelResolveRequest,
        ): ReturnType<KickChannelsClient["resolve"]> {
            validateChannelResolveRequest(request)
            const appAccessToken = requireKickAppAccessToken(
                options.appAccessToken,
                "channels.resolve()",
            )

            const slug = normalizeKickSlug(request.slug)
            const url = new URL("https://api.kick.com/public/v1/channels")
            url.searchParams.append("slug", slug)

            let response: Response

            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${appAccessToken}`,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Kick API request failed.", {
                    platform: KICK_PLATFORM,
                    cause: error,
                })
            }

            if (!response.ok) {
                throw new PlatformApiError("Kick API request failed.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                })
            }

            const payload = (await response.json()) as KickChannelResponse
            const item = payload.data?.[0]

            if (!item?.broadcaster_user_id) {
                throw new PlatformApiError("Kick channel was not found.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                })
            }

            const result = {
                platform: KICK_PLATFORM,
                broadcasterUserId: item.broadcaster_user_id,
                slug: item.slug ?? slug,
                displayName: item.slug ?? slug,
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
