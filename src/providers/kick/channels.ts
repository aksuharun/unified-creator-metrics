import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import type { KickUserAccessTokenProvider } from "./auth.js"
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
    userAccessTokenProvider?: KickUserAccessTokenProvider
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
                profilePictureUrl: (item as any).profile_picture ?? (item as any).user?.profile_picture ?? (item as any).avatar ?? null,
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

        async getAuthenticatedUser(): ReturnType<KickChannelsClient["getAuthenticatedUser"]> {
            const userAccessTokenProvider = requireKickUserAccessTokenProvider(
                options.userAccessTokenProvider,
                "channels.getAuthenticatedUser()",
            )
            const userAccessToken = await userAccessTokenProvider.getAccessToken()

            const url = new URL("https://api.kick.com/public/v1/users")

            const runRequest = async (accessToken: string): Promise<Response> => {
                try {
                    return await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    })
                } catch (error) {
                    throw new PlatformApiError("Kick API request failed.", {
                        platform: KICK_PLATFORM,
                        cause: error,
                    })
                }
            }

            let response = await runRequest(userAccessToken)

            if (response.status === 401 && userAccessTokenProvider.canRefresh) {
                response = await runRequest(
                    await userAccessTokenProvider.refreshAccessToken(),
                )
            }

            if (!response.ok) {
                throw new PlatformApiError("Kick API request failed.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                })
            }

            const payload = (await response.json()) as any
            const user = Array.isArray(payload.data) ? payload.data[0] : payload.data

            const userId = user?.id ?? user?.user_id ?? user?.broadcaster_user_id
            const slug = user?.name ?? user?.username ?? user?.slug

            if (!userId) {
                throw new PlatformApiError("Kick authenticated user was not found.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                })
            }

            return {
                platform: KICK_PLATFORM,
                broadcasterUserId: Number(userId),
                slug: slug ?? "",
                displayName: slug ?? null,
                profilePictureUrl: user?.profile_picture ?? null,
                fetchedAt: new Date().toISOString(),
            }
        },
    }
}

function requireKickUserAccessTokenProvider(
    provider: KickUserAccessTokenProvider | undefined,
    feature: string,
): KickUserAccessTokenProvider {
    if (provider) {
        return provider
    }

    throw new PlatformValidationError(
        `Kick userAccessToken is required for ${feature}.`,
        {
            platform: KICK_PLATFORM,
        },
    )
}
