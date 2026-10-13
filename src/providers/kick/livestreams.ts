import { PlatformApiError } from "../../errors.js"
import { KICK_PLATFORM } from "./constants.js"
import type { KickChannelResponse } from "./normalize.js"
import {
    requireKickAppAccessToken,
    validateActiveLivestreamsRequest,
} from "./validation.js"
import type { KickLivestreamsClient, KickActiveLivestreamsRequest } from "./types.js"
import type { Livestream } from "../../types.js"

export type KickLivestreamsClientOptions = {
    appAccessToken?: string
}

export function createKickLivestreamsClient(
    options: KickLivestreamsClientOptions,
): KickLivestreamsClient {
    return {
        /**
         * Fetch active (currently live) streams for a Kick channel.
         */
        async getActive(
            request: KickActiveLivestreamsRequest,
        ): ReturnType<KickLivestreamsClient["getActive"]> {
            validateActiveLivestreamsRequest(request)
            const appAccessToken = requireKickAppAccessToken(
                options.appAccessToken,
                "livestreams.getActive()",
            )

            const url = new URL("https://api.kick.com/public/v1/channels")
            // In Kick, we search by channel slug. We map the normalized channelId to Kick slug.
            url.searchParams.append("slug", request.channelId)

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

            if (!item) {
                throw new PlatformApiError("Kick channel was not found.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                })
            }

            // Return active streams (only if is_live is true)
            const isLive = item.stream?.is_live === true
            if (!isLive) {
                return []
            }

            const streamId = item.broadcaster_user_id ? String(item.broadcaster_user_id) : ""
            const includeRaw = request.includeRaw === true

            const stream: Livestream<"kick"> = {
                platform: KICK_PLATFORM,
                streamId,
                title: item.stream_title ?? null,
                channelId: item.slug ?? request.channelId,
                channelDisplayName: item.slug ?? null,
                status: "live",
                concurrentViewers:
                    typeof item.stream?.viewer_count === "number"
                        ? item.stream.viewer_count
                        : null,
                startedAt: null, // Kick public channel endpoint does not provide stream start time
                fetchedAt: new Date().toISOString(),
                ...(includeRaw ? { raw: item } : {}),
            }

            return [stream]
        },
    }
}
