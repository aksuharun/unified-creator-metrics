import { PlatformApiError } from "../../errors.js";
import { TWITCH_PLATFORM } from "./constants.js";
import { normalizeTwitchLogin, validateChannelMetricsRequest, validateChannelResolveRequest, } from "./validation.js";
export function createTwitchChannelsClient(options) {
    return {
        async resolve(request) {
            validateChannelResolveRequest(request);
            const login = normalizeTwitchLogin(request.login);
            const url = new URL("https://api.twitch.tv/helix/users");
            url.searchParams.append("login", login);
            let response;
            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${options.accessToken}`,
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
            if (!response.ok) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                });
            }
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
            const url = new URL("https://api.twitch.tv/helix/channels/followers");
            url.searchParams.append("broadcaster_id", request.channelId);
            let response;
            try {
                response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${options.accessToken}`,
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
            if (!response.ok) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    status: response.status,
                });
            }
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
    };
}
