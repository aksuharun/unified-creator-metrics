import { PlatformApiError } from "../../errors.js";
import { KICK_PLATFORM } from "./constants.js";
import { normalizeKickVideoMetrics, } from "./normalize.js";
import { requireKickAppAccessToken, validateVideoMetricsRequest, } from "./validation.js";
export function createKickVideosClient(options) {
    return {
        async getMetrics(request) {
            validateVideoMetricsRequest(request);
            const appAccessToken = requireKickAppAccessToken(options.appAccessToken, "videos.getMetrics()");
            const url = new URL("https://api.kick.com/public/v1/channels");
            url.searchParams.append("slug", request.videoId);
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
            if (!item) {
                throw new PlatformApiError("Kick livestream was not found.", {
                    platform: KICK_PLATFORM,
                    status: response.status,
                });
            }
            return normalizeKickVideoMetrics(item, {
                includeRaw: request.includeRaw === true,
                raw: payload,
            });
        },
    };
}
