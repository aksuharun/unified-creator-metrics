import { PlatformApiError } from "../../errors.js";
import { KICK_PLATFORM } from "./constants.js";
import { normalizeKickSlug, validateChannelResolveRequest, } from "./validation.js";
export function createKickChannelsClient(options) {
    return {
        async resolve(request) {
            validateChannelResolveRequest(request);
            const slug = normalizeKickSlug(request.slug);
            const url = new URL("https://api.kick.com/public/v1/channels");
            url.searchParams.append("slug", slug);
            let response;
            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${options.accessToken}`,
                    },
                });
            }
            catch (error) {
                throw new PlatformApiError("Kick API request failed.", {
                    platform: KICK_PLATFORM,
                    cause: error,
                });
            }
            if (!response.ok) {
                throw new PlatformApiError("Kick API request failed.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                });
            }
            const payload = (await response.json());
            const item = payload.data?.[0];
            if (!item?.broadcaster_user_id) {
                throw new PlatformApiError("Kick channel was not found.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                });
            }
            const result = {
                platform: KICK_PLATFORM,
                broadcasterUserId: item.broadcaster_user_id,
                slug: item.slug ?? slug,
                displayName: item.slug ?? slug,
                fetchedAt: new Date().toISOString(),
            };
            if (request.includeRaw === true) {
                return {
                    ...result,
                    raw: payload,
                };
            }
            return result;
        },
    };
}
