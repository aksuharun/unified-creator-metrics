import { PlatformApiError, PlatformValidationError } from "../../errors.js";
import { createTwitchUserAccessTokenProvider, } from "./auth.js";
import { TWITCH_PLATFORM } from "./constants.js";
import { normalizeTwitchLogin, validateChannelMetricsRequest, validateChannelResolveRequest, } from "./validation.js";
export function createTwitchChannelsClient(options) {
    const sharedUserAccessTokenProvider = options.userAccessTokenProvider ??
        createTwitchUserAccessTokenProvider({
            accessToken: options.userAccessToken,
            clientId: options.clientId,
        });
    return {
        async resolve(request) {
            validateChannelResolveRequest(request);
            const accessToken = options.appAccessToken ??
                (await requireTwitchUserAccessTokenProvider(sharedUserAccessTokenProvider, "channels.resolve()").getAccessToken());
            const login = normalizeTwitchLogin(request.login);
            const url = new URL("https://api.twitch.tv/helix/users");
            url.searchParams.append("login", login);
            const response = await twitchApiFetch(url, {
                clientId: options.clientId,
                accessToken,
                accessTokenProvider: options.appAccessToken === undefined
                    ? sharedUserAccessTokenProvider
                    : undefined,
            });
            const payload = (await response.json());
            const user = payload.data?.[0];
            if (!user?.id) {
                throw new PlatformApiError("Twitch broadcaster was not found.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                });
            }
            const result = {
                platform: TWITCH_PLATFORM,
                broadcasterId: user.id,
                login: user.login ?? login,
                displayName: user.display_name ?? null,
                profilePictureUrl: user.profile_image_url ?? null,
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
        async getMetrics(request) {
            validateChannelMetricsRequest(request);
            const userAccessTokenProvider = requireTwitchUserAccessTokenProvider(sharedUserAccessTokenProvider, "channels.getMetrics()");
            const userAccessToken = await userAccessTokenProvider.getAccessToken();
            const url = new URL("https://api.twitch.tv/helix/channels/followers");
            url.searchParams.append("broadcaster_id", request.channelId);
            const response = await twitchApiFetch(url, {
                clientId: options.clientId,
                accessToken: userAccessToken,
                accessTokenProvider: userAccessTokenProvider,
            });
            const payload = (await response.json());
            const result = {
                platform: TWITCH_PLATFORM,
                channelId: request.channelId,
                displayName: null,
                followers: typeof payload.total === "number" ? payload.total : null,
                views: null,
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
            const userAccessTokenProvider = requireTwitchUserAccessTokenProvider(sharedUserAccessTokenProvider, "channels.getAuthenticatedUser()");
            const userAccessToken = await userAccessTokenProvider.getAccessToken();
            const url = new URL("https://api.twitch.tv/helix/users");
            const response = await twitchApiFetch(url, {
                clientId: options.clientId,
                accessToken: userAccessToken,
                accessTokenProvider: userAccessTokenProvider,
            });
            const payload = (await response.json());
            const user = payload.data?.[0];
            if (!user?.id) {
                throw new PlatformApiError("Twitch authenticated user was not found.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                });
            }
            return {
                platform: TWITCH_PLATFORM,
                broadcasterId: user.id,
                login: user.login ?? "",
                displayName: user.display_name ?? null,
                profilePictureUrl: user.profile_image_url ?? null,
                fetchedAt: new Date().toISOString(),
            };
        },
    };
}
function requireTwitchUserAccessTokenProvider(provider, feature) {
    if (provider) {
        return provider;
    }
    throw new PlatformValidationError(`Twitch userAccessToken is required for ${feature}.`, {
        platform: TWITCH_PLATFORM,
    });
}
async function twitchApiFetch(url, options) {
    const runRequest = async (accessToken) => {
        try {
            return await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Client-Id": options.clientId,
                },
            });
        }
        catch (error) {
            throw new PlatformApiError("Twitch API request failed.", {
                platform: TWITCH_PLATFORM,
                cause: error,
            });
        }
    };
    let response = await runRequest(options.accessToken);
    if (response.status === 401 && options.accessTokenProvider?.canRefresh) {
        response = await runRequest(await options.accessTokenProvider.refreshAccessToken());
    }
    if (!response.ok) {
        throw new PlatformApiError("Twitch API request failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
        });
    }
    return response;
}
