import { PlatformValidationError } from "./errors.js";
/**
 * Create a client that routes normalized requests to provider-specific clients.
 *
 * The multi-platform client does not own provider credentials. It composes
 * provider clients that can also be used directly.
 */
export function createMultiPlatformClient(config) {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Multi-platform client config is required.");
    }
    const providers = {
        youtube: config.youtube,
    };
    return {
        channels: {
            async getMetrics(request) {
                if (!request || typeof request !== "object") {
                    throw new PlatformValidationError("Channel metrics request is required.");
                }
                const provider = providers[request.platform];
                if (!provider) {
                    throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
                }
                return provider.channels.getMetrics({
                    channelId: request.channelId,
                    metrics: request.metrics,
                    includeRaw: request.includeRaw,
                });
            },
        },
        videos: {
            async getMetrics(request) {
                if (!request || typeof request !== "object") {
                    throw new PlatformValidationError("Video metrics request is required.");
                }
                const provider = providers[request.platform];
                if (!provider) {
                    throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
                }
                return provider.videos.getMetrics({
                    videoId: request.videoId,
                    metrics: request.metrics,
                    includeRaw: request.includeRaw,
                });
            },
        },
    };
}
