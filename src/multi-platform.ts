import { PlatformValidationError } from "./errors.js"
import type {
    ChannelMetrics,
    Platform,
    VideoMetrics,
} from "./types.js"
import type {
    ChannelMetricsRequest as YoutubeChannelMetricsRequest,
    VideoMetricsRequest as YoutubeVideoMetricsRequest,
    YoutubeClient,
} from "./providers/youtube/types.js"

/**
 * Provider clients available to the multi-platform router.
 */
export type MultiPlatformClientConfig = {
    /**
   * YouTube provider client.
   */
    youtube?: YoutubeClient
}

/**
 * Request for normalized channel metrics through the multi-platform router.
 */
export type MultiPlatformChannelMetricsRequest = YoutubeChannelMetricsRequest & {
    /**
   * Platform to route the request to.
   */
    platform: Extract<Platform, "youtube">
}

/**
 * Request for normalized video metrics through the multi-platform router.
 */
export type MultiPlatformVideoMetricsRequest = YoutubeVideoMetricsRequest & {
    /**
   * Platform to route the request to.
   */
    platform: Extract<Platform, "youtube">
}

/**
 * Channel metric methods exposed by the multi-platform client.
 */
export type MultiPlatformChannelsClient = {
    /**
   * Route a normalized channel metrics request to the selected provider.
   */
    getMetrics(request: MultiPlatformChannelMetricsRequest): Promise<ChannelMetrics>
}

/**
 * Video metric methods exposed by the multi-platform client.
 */
export type MultiPlatformVideosClient = {
    /**
   * Route a normalized video metrics request to the selected provider.
   */
    getMetrics(request: MultiPlatformVideoMetricsRequest): Promise<VideoMetrics>
}

/**
 * Client that exposes one normalized API across configured providers.
 */
export type MultiPlatformClient = {
    /**
   * Channel-related methods.
   */
    channels: MultiPlatformChannelsClient

    /**
   * Video-related methods.
   */
    videos: MultiPlatformVideosClient
}

/**
 * Create a client that routes normalized requests to provider-specific clients.
 *
 * The multi-platform client does not own provider credentials. It composes
 * provider clients that can also be used directly.
 */
export function createMultiPlatformClient(
    config: MultiPlatformClientConfig,
): MultiPlatformClient {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Multi-platform client config is required.")
    }

    const providers = {
        youtube: config.youtube,
    }

    return {
        channels: {
            async getMetrics(request) {
                if (!request || typeof request !== "object") {
                    throw new PlatformValidationError("Channel metrics request is required.")
                }

                const provider = providers[request.platform]

                if (!provider) {
                    throw new PlatformValidationError(
                        `No provider client was configured for platform "${request.platform}".`,
                        { platform: request.platform },
                    )
                }

                return provider.channels.getMetrics({
                    channelId: request.channelId,
                    metrics: request.metrics,
                    includeRaw: request.includeRaw,
                })
            },
        },
        videos: {
            async getMetrics(request) {
                if (!request || typeof request !== "object") {
                    throw new PlatformValidationError("Video metrics request is required.")
                }

                const provider = providers[request.platform]

                if (!provider) {
                    throw new PlatformValidationError(
                        `No provider client was configured for platform "${request.platform}".`,
                        { platform: request.platform },
                    )
                }

                return provider.videos.getMetrics({
                    videoId: request.videoId,
                    metrics: request.metrics,
                    includeRaw: request.includeRaw,
                })
            },
        },
    }
}
