import { PlatformApiError, PlatformValidationError } from "../../errors.js";
import { KICK_PLATFORM } from "./constants.js";
import { normalizeKickSlug, requireKickAppAccessToken, validateChannelResolveRequest, } from "./validation.js";
export function createKickChannelsClient(options) {
    return {
        async resolve(request) {
            validateChannelResolveRequest(request);
            const appAccessToken = requireKickAppAccessToken(options.appAccessToken, "channels.resolve()");
            const slug = normalizeKickSlug(request.slug);
            const url = new URL("https://api.kick.com/public/v1/channels");
            url.searchParams.append("slug", slug);
            let response;
            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${appAccessToken}`,
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
                profilePictureUrl: item.profile_picture ?? item.user?.profile_picture ?? item.avatar ?? null,
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
        async getAuthenticatedUser() {
            const userAccessTokenProvider = requireKickUserAccessTokenProvider(options.userAccessTokenProvider, "channels.getAuthenticatedUser()");
            const userAccessToken = await userAccessTokenProvider.getAccessToken();
            const url = new URL("https://api.kick.com/public/v1/users");
            const runRequest = async (accessToken) => {
                try {
                    return await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                }
                catch (error) {
                    throw new PlatformApiError("Kick API request failed.", {
                        platform: KICK_PLATFORM,
                        cause: error,
                    });
                }
            };
            let response = await runRequest(userAccessToken);
            if (response.status === 401 && userAccessTokenProvider.canRefresh) {
                response = await runRequest(await userAccessTokenProvider.refreshAccessToken());
            }
            if (!response.ok) {
                throw new PlatformApiError("Kick API request failed.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                });
            }
            const payload = (await response.json());
            const user = Array.isArray(payload.data) ? payload.data[0] : payload.data;
            const userId = user?.id ?? user?.user_id ?? user?.broadcaster_user_id;
            const slug = user?.name ?? user?.username ?? user?.slug;
            if (!userId) {
                throw new PlatformApiError("Kick authenticated user was not found.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                });
            }
            return {
                platform: KICK_PLATFORM,
                broadcasterUserId: Number(userId),
                slug: slug ?? "",
                displayName: slug ?? null,
                profilePictureUrl: user?.profile_picture ?? null,
                fetchedAt: new Date().toISOString(),
            };
        },
    };
}
function requireKickUserAccessTokenProvider(provider, feature) {
    if (provider) {
        return provider;
    }
    throw new PlatformValidationError(`Kick userAccessToken is required for ${feature}.`, {
        platform: KICK_PLATFORM,
    });
}
