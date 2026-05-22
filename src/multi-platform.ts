import { ChatListenerEmitter } from "./chat-listener.js"
import { PlatformValidationError } from "./errors.js"
import type {
    KickChannelResolveRequest,
    KickChannelResolveResult,
    KickChatStartResult,
    KickClient,
    KickChatListenRequest,
    KickChatListener,
    KickNodeWebhookRequest,
    KickSendMessageRequest,
    KickStopOptions,
    KickWebhookRequest,
    KickWebhookResult,
    VideoMetricsRequest as KickVideoMetricsRequest,
} from "./providers/kick/types.js"
import type {
    ChannelMetricsRequest as TwitchChannelMetricsRequest,
    TwitchChatListenRequest,
    TwitchChatListener,
    TwitchChatStartResult,
    TwitchChannelResolveRequest,
    TwitchChannelResolveResult,
    TwitchClient,
    TwitchStopOptions,
} from "./providers/twitch/types.js"
import type {
    ChannelMetrics,
    ChatListener,
    ChatMessage,
    Platform,
    SendMessageResult,
    VideoMetrics,
} from "./types.js"
import type {
    ChannelMetricsRequest as YoutubeChannelMetricsRequest,
    YoutubeChannelResolveRequest,
    YoutubeChannelResolveResult,
    YoutubeChatListenRequest,
    YoutubeChatListener,
    YoutubeSendMessageRequest,
    YoutubeChatStartResult,
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
    /**
   * Twitch provider client.
   */
    twitch?: TwitchClient
    /**
   * Kick provider client.
   */
    kick?: KickClient
}

/**
 * Request for normalized YouTube channel metrics through the multi-platform router.
 */
export type MultiPlatformYoutubeChannelMetricsRequest =
    YoutubeChannelMetricsRequest & {
        /**
     * Platform to route the request to.
     */
        platform: Extract<Platform, "youtube">
    }

/**
 * Request for normalized Twitch channel metrics through the multi-platform router.
 */
export type MultiPlatformTwitchChannelMetricsRequest =
    TwitchChannelMetricsRequest & {
        /**
     * Platform to route the request to.
     */
        platform: Extract<Platform, "twitch">
    }

export type MultiPlatformChannelMetricsRequest =
    | MultiPlatformYoutubeChannelMetricsRequest
    | MultiPlatformTwitchChannelMetricsRequest

export type MultiPlatformChannelMetricsBatchRequest =
    readonly MultiPlatformChannelMetricsRequest[]

export type MultiPlatformYoutubeChannelResolveRequest =
    YoutubeChannelResolveRequest & {
        /**
     * Platform to route the request to.
     */
        platform: Extract<Platform, "youtube">
    }

export type MultiPlatformKickChannelResolveRequest =
    KickChannelResolveRequest & {
        /**
     * Platform to route the request to.
     */
        platform: Extract<Platform, "kick">
    }

export type MultiPlatformTwitchChannelResolveRequest =
    TwitchChannelResolveRequest & {
        /**
     * Platform to route the request to.
     */
        platform: Extract<Platform, "twitch">
    }

export type MultiPlatformChannelResolveRequest =
    | MultiPlatformYoutubeChannelResolveRequest
    | MultiPlatformTwitchChannelResolveRequest
    | MultiPlatformKickChannelResolveRequest

export type MultiPlatformChannelResolveResult =
    | YoutubeChannelResolveResult
    | TwitchChannelResolveResult
    | KickChannelResolveResult

/**
 * Request for normalized video metrics through the multi-platform router.
 */
export type MultiPlatformYoutubeVideoMetricsRequest =
    YoutubeVideoMetricsRequest & {
        /**
     * Platform to route the request to.
     */
        platform: Extract<Platform, "youtube">
    }

export type MultiPlatformKickVideoMetricsRequest = KickVideoMetricsRequest & {
    /**
   * Platform to route the request to.
   */
    platform: Extract<Platform, "kick">
}

export type MultiPlatformVideoMetricsRequest =
    | MultiPlatformYoutubeVideoMetricsRequest
    | MultiPlatformKickVideoMetricsRequest

export type MultiPlatformVideoMetricsBatchRequest =
    readonly MultiPlatformVideoMetricsRequest[]

export type MultiPlatformYoutubeChatListenRequest = YoutubeChatListenRequest & {
    platform: Extract<Platform, "youtube">
}

export type MultiPlatformKickChatListenRequest = KickChatListenRequest & {
    platform: Extract<Platform, "kick">
}

export type MultiPlatformTwitchChatListenRequest = TwitchChatListenRequest & {
    platform: Extract<Platform, "twitch">
}

export type MultiPlatformChatListenRequest =
    | MultiPlatformYoutubeChatListenRequest
    | MultiPlatformTwitchChatListenRequest
    | MultiPlatformKickChatListenRequest

export type MultiPlatformChatListenBatchRequest =
    readonly MultiPlatformChatListenRequest[]

export type MultiPlatformYoutubeSendMessageRequest = YoutubeSendMessageRequest & {
    platform: Extract<Platform, "youtube">
}

export type MultiPlatformKickSendMessageRequest = KickSendMessageRequest & {
    platform: Extract<Platform, "kick">
}

export type MultiPlatformSendMessageRequest =
    | MultiPlatformYoutubeSendMessageRequest
    | MultiPlatformKickSendMessageRequest

export type MultiPlatformYoutubeChatStartResult = YoutubeChatStartResult & {
    platform: Extract<Platform, "youtube">
}

export type MultiPlatformKickChatStartResult = KickChatStartResult & {
    platform: Extract<Platform, "kick">
}

export type MultiPlatformTwitchChatStartResult = TwitchChatStartResult & {
    platform: Extract<Platform, "twitch">
}

export type MultiPlatformChatStartResult = readonly (
    | MultiPlatformYoutubeChatStartResult
    | MultiPlatformTwitchChatStartResult
    | MultiPlatformKickChatStartResult
)[]

export type MultiPlatformChatStopOptions = {
    twitch?: TwitchStopOptions
    kick?: KickStopOptions
}

export type MultiPlatformChatWebhookDispatchResult = {
    platform: Extract<Platform, "kick">
    result: KickWebhookResult
}

export type MultiPlatformChatListener = Omit<
    ChatListener<ChatMessage, MultiPlatformChatStartResult>,
    "stop"
> & {
    stop(options?: MultiPlatformChatStopOptions): Promise<void>
    handleWebhook(
        request: KickWebhookRequest,
    ): Promise<readonly MultiPlatformChatWebhookDispatchResult[]>
    handleNodeWebhook(
        request: KickNodeWebhookRequest,
    ): Promise<readonly MultiPlatformChatWebhookDispatchResult[]>
}

/**
 * Channel metric methods exposed by the multi-platform client.
 */
export type MultiPlatformChannelsClient = {
    /**
   * Route a provider-native channel identity lookup to the selected provider.
   */
    resolve(
        request: MultiPlatformChannelResolveRequest,
    ): Promise<MultiPlatformChannelResolveResult>

    /**
   * Route a normalized channel metrics request to the selected provider.
   */
    getMetrics(request: MultiPlatformChannelMetricsRequest): Promise<ChannelMetrics>
    getMetrics(
        request: MultiPlatformChannelMetricsBatchRequest,
    ): Promise<ChannelMetrics[]>
}

/**
 * Video metric methods exposed by the multi-platform client.
 */
export type MultiPlatformVideosClient = {
    /**
   * Route a normalized video metrics request to the selected provider.
   */
    getMetrics(request: MultiPlatformVideoMetricsRequest): Promise<VideoMetrics>
    getMetrics(request: MultiPlatformVideoMetricsBatchRequest): Promise<VideoMetrics[]>
}

export type MultiPlatformChatsClient = {
    listen(
        request:
            | MultiPlatformChatListenRequest
            | MultiPlatformChatListenBatchRequest,
    ): MultiPlatformChatListener

    /**
     * Route a standardized text message to the selected provider.
     */
    sendMessage(request: MultiPlatformSendMessageRequest): Promise<SendMessageResult>
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

    /**
   * Chat-related methods.
   */
    chats: MultiPlatformChatsClient
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
        twitch: config.twitch,
        kick: config.kick,
    }

    return {
        channels: createMultiPlatformChannelsClient(providers),
        videos: createMultiPlatformVideosClient(providers),
        chats: createMultiPlatformChatsClient(providers),
    }
}

function createMultiPlatformChannelsClient(
    providers: MultiPlatformClientConfig,
): MultiPlatformChannelsClient {
    async function resolve(
        request: MultiPlatformChannelResolveRequest,
    ): Promise<MultiPlatformChannelResolveResult> {
        return dispatchChannelResolve(request, providers)
    }

    function getMetrics(
        request: MultiPlatformChannelMetricsRequest,
    ): Promise<ChannelMetrics>
    function getMetrics(
        request: MultiPlatformChannelMetricsBatchRequest,
    ): Promise<ChannelMetrics[]>
    function getMetrics(
        request:
            | MultiPlatformChannelMetricsRequest
            | MultiPlatformChannelMetricsBatchRequest,
    ): Promise<ChannelMetrics | ChannelMetrics[]> {
        if (isChannelMetricsBatchRequest(request)) {
            return Promise.all(
                request.map((item) => dispatchChannelMetrics(item, providers)),
            )
        }

        return dispatchChannelMetrics(request, providers)
    }

    return { resolve, getMetrics }
}

function createMultiPlatformVideosClient(
    providers: MultiPlatformClientConfig,
): MultiPlatformVideosClient {
    function getMetrics(
        request: MultiPlatformVideoMetricsRequest,
    ): Promise<VideoMetrics>
    function getMetrics(
        request: MultiPlatformVideoMetricsBatchRequest,
    ): Promise<VideoMetrics[]>
    function getMetrics(
        request:
            | MultiPlatformVideoMetricsRequest
            | MultiPlatformVideoMetricsBatchRequest,
    ): Promise<VideoMetrics | VideoMetrics[]> {
        if (isVideoMetricsBatchRequest(request)) {
            return Promise.all(
                request.map((item) => dispatchVideoMetrics(item, providers)),
            )
        }

        return dispatchVideoMetrics(request, providers)
    }

    return { getMetrics }
}

function createMultiPlatformChatsClient(
    providers: MultiPlatformClientConfig,
): MultiPlatformChatsClient {
    function listen(
        request:
            | MultiPlatformChatListenRequest
            | MultiPlatformChatListenBatchRequest,
    ): MultiPlatformChatListener {
        const requests = Array.isArray(request) ? request : [request]

        return new MultiPlatformChatListenerImpl(
            requests.map((item) => createChatSubscription(item, providers)),
        )
    }

    async function sendMessage(
        request: MultiPlatformSendMessageRequest,
    ): Promise<SendMessageResult> {
        return dispatchSendMessage(request, providers)
    }

    return { listen, sendMessage }
}

function isChannelMetricsBatchRequest(
    request:
        | MultiPlatformChannelMetricsRequest
        | MultiPlatformChannelMetricsBatchRequest,
): request is MultiPlatformChannelMetricsBatchRequest {
    return Array.isArray(request)
}

function isVideoMetricsBatchRequest(
    request:
        | MultiPlatformVideoMetricsRequest
        | MultiPlatformVideoMetricsBatchRequest,
): request is MultiPlatformVideoMetricsBatchRequest {
    return Array.isArray(request)
}

type MultiPlatformYoutubeChatSubscription = {
    platform: Extract<Platform, "youtube">
    listener: YoutubeChatListener
}

type MultiPlatformKickChatSubscription = {
    platform: Extract<Platform, "kick">
    listener: KickChatListener
}

type MultiPlatformTwitchChatSubscription = {
    platform: Extract<Platform, "twitch">
    listener: TwitchChatListener
}

type MultiPlatformChatSubscription =
    | MultiPlatformYoutubeChatSubscription
    | MultiPlatformTwitchChatSubscription
    | MultiPlatformKickChatSubscription

function dispatchChannelResolve(
    request: MultiPlatformChannelResolveRequest,
    providers: MultiPlatformClientConfig,
): Promise<MultiPlatformChannelResolveResult> {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.")
    }

    if (request.platform === "youtube") {
        const provider = providers.youtube

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        return provider.channels.resolve({
            handle: request.handle,
            includeRaw: request.includeRaw,
        })
    }

    if (request.platform === "twitch") {
        const provider = providers.twitch

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        return provider.channels.resolve({
            login: request.login,
            includeRaw: request.includeRaw,
        })
    }

    if (request.platform === "kick") {
        const provider = providers.kick

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        return provider.channels.resolve({
            slug: request.slug,
            includeRaw: request.includeRaw,
        })
    }

    throw new PlatformValidationError(
        `Channel resolve is not supported for platform "${String(
            (request as { platform?: unknown }).platform,
        )}".`,
        { platform: String((request as { platform?: unknown }).platform) },
    )
}

function dispatchChannelMetrics(
    request: MultiPlatformChannelMetricsRequest,
    providers: MultiPlatformClientConfig,
): Promise<ChannelMetrics> {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel metrics request is required.")
    }

    if (request.platform === "youtube") {
        const provider = providers.youtube

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
    }

    if (request.platform === "twitch") {
        const provider = providers.twitch

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
    }

    throw new PlatformValidationError(
        `Channel metrics are not supported for platform "${String(
            (request as { platform?: unknown }).platform,
        )}".`,
        { platform: String((request as { platform?: unknown }).platform) },
    )
}

function createChatSubscription(
    request: MultiPlatformChatListenRequest,
    providers: MultiPlatformClientConfig,
): MultiPlatformChatSubscription {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Chat listen request is required.")
    }

    if (request.platform === "youtube") {
        const provider = providers.youtube

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        return {
            platform: "youtube",
            listener: provider.chat.listen({
                liveVideoId: request.liveVideoId,
                liveChatId: request.liveChatId,
                pollingIntervalMs: request.pollingIntervalMs,
                maxResults: request.maxResults,
                includeHistory: request.includeHistory,
                maxRecentMessageIds: request.maxRecentMessageIds,
                includeRaw: request.includeRaw,
            }),
        }
    }

    if (request.platform === "twitch") {
        const provider = providers.twitch

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        return {
            platform: "twitch",
            listener: provider.chat.listen({
                broadcasterId: request.broadcasterId,
                includeRaw: request.includeRaw,
                maxRecentMessageIds: request.maxRecentMessageIds,
                websocketUrl: request.websocketUrl,
                keepaliveTimeoutSeconds: request.keepaliveTimeoutSeconds,
            }),
        }
    }

    const provider = providers.kick

    if (!provider) {
        throw new PlatformValidationError(
            `No provider client was configured for platform "${request.platform}".`,
            { platform: request.platform },
        )
    }

    return {
        platform: "kick",
        listener: provider.chat.listen({
            broadcasterUserId: request.broadcasterUserId,
            includeRaw: request.includeRaw,
            maxRecentMessageIds: request.maxRecentMessageIds,
            subscription: request.subscription,
            webhook: request.webhook,
        }),
    }
}

function dispatchVideoMetrics(
    request: MultiPlatformVideoMetricsRequest,
    providers: MultiPlatformClientConfig,
): Promise<VideoMetrics> {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.")
    }

    if (request.platform === "youtube") {
        const provider = providers.youtube

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
    }

    const provider = providers.kick

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
}

function dispatchSendMessage(
    request: MultiPlatformSendMessageRequest,
    providers: MultiPlatformClientConfig,
): Promise<SendMessageResult> {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Send message request is required.")
    }

    if (request.platform === "youtube") {
        const provider = providers.youtube

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        return provider.chat.sendMessage({
            liveChatId: request.liveChatId,
            text: request.text,
            includeRaw: request.includeRaw,
        })
    }

    if (request.platform === "kick") {
        const provider = providers.kick

        if (!provider) {
            throw new PlatformValidationError(
                `No provider client was configured for platform "${request.platform}".`,
                { platform: request.platform },
            )
        }

        if (request.type === "bot") {
            return provider.chat.sendMessage({
                type: request.type,
                text: request.text,
                includeRaw: request.includeRaw,
            })
        }

        return provider.chat.sendMessage({
            type: request.type,
            broadcasterUserId: request.broadcasterUserId,
            text: request.text,
            includeRaw: request.includeRaw,
        })
    }

    throw new PlatformValidationError(
        `Chat messages are not supported for platform "${String(
            (request as { platform?: unknown }).platform,
        )}".`,
        { platform: String((request as { platform?: unknown }).platform) },
    )
}

class MultiPlatformChatListenerImpl
    extends ChatListenerEmitter<ChatMessage, MultiPlatformChatStartResult>
    implements MultiPlatformChatListener {
    constructor(
        private readonly subscriptions: readonly MultiPlatformChatSubscription[],
    ) {
        super()

        for (const subscription of subscriptions) {
            if (subscription.platform === "youtube") {
                subscription.listener.on("message", (message) => {
                    this.emitMessage(message)
                })
                subscription.listener.on("error", (error) => {
                    this.emitError(error)
                })
                continue
            }

            if (subscription.platform === "twitch") {
                subscription.listener.on("message", (message) => {
                    this.emitMessage(message)
                })
                subscription.listener.on("error", (error) => {
                    this.emitError(error)
                })
                continue
            }

            subscription.listener.on("message", (message) => {
                this.emitMessage(message)
            })
            subscription.listener.on("error", (error) => {
                this.emitError(error)
            })
        }
    }

    async start(): Promise<MultiPlatformChatStartResult> {
        const results = await Promise.allSettled(
            this.subscriptions.map((subscription) => {
                return this.startSubscription(subscription)
            }),
        )

        const rejectedResult = results.find((item) => item.status === "rejected")

        if (rejectedResult) {
            await this.cleanupStartedSubscriptions(results)
            throw rejectedResult.reason
        }

        const startedSubscriptions: Array<
            | MultiPlatformYoutubeChatStartResult
            | MultiPlatformTwitchChatStartResult
            | MultiPlatformKickChatStartResult
        > = []

        for (const result of results) {
            if (result.status === "fulfilled") {
                startedSubscriptions.push(result.value)
            }
        }

        return startedSubscriptions
    }

    async stop(options: MultiPlatformChatStopOptions = {}): Promise<void> {
        await Promise.all(
            this.subscriptions.map((subscription) => {
                return this.stopSubscription(subscription, options)
            }),
        )
    }

    async handleWebhook(
        request: KickWebhookRequest,
    ): Promise<readonly MultiPlatformChatWebhookDispatchResult[]> {
        const listeners = this.getKickSubscriptions()

        if (listeners.length === 0) {
            throw new PlatformValidationError(
                "No Kick chat listeners were configured for webhook handling.",
                { platform: "kick" },
            )
        }

        const results = await Promise.all(
            listeners.map(async (subscription) => ({
                platform: subscription.platform,
                result: await subscription.listener.handleWebhook(request),
            })),
        )

        return results
    }

    async handleNodeWebhook(
        request: KickNodeWebhookRequest,
    ): Promise<readonly MultiPlatformChatWebhookDispatchResult[]> {
        return this.handleWebhook({
            headers: request.headers,
            rawBody: await readRawBody(request),
        })
    }

    private getKickSubscriptions(): MultiPlatformKickChatSubscription[] {
        return this.subscriptions.filter((subscription) => {
            return subscription.platform === "kick"
        })
    }

    private async startSubscription(
        subscription: MultiPlatformChatSubscription,
    ): Promise<
        | MultiPlatformYoutubeChatStartResult
        | MultiPlatformTwitchChatStartResult
        | MultiPlatformKickChatStartResult
    > {
        if (subscription.platform === "youtube") {
            const result = await subscription.listener.start()
            return {
                platform: subscription.platform,
                liveChatId: result.liveChatId,
                liveVideoId: result.liveVideoId,
            }
        }

        if (subscription.platform === "twitch") {
            const result = await subscription.listener.start()
            return {
                platform: subscription.platform,
                broadcasterId: result.broadcasterId,
                sessionId: result.sessionId,
                userId: result.userId,
                subscriptions: result.subscriptions,
            }
        }

        const result = await subscription.listener.start()

        return {
            platform: subscription.platform,
            subscriptions: result.subscriptions,
        }
    }

    private async stopSubscription(
        subscription: MultiPlatformChatSubscription,
        options: MultiPlatformChatStopOptions,
    ): Promise<void> {
        if (subscription.platform === "twitch") {
            await subscription.listener.stop(options.twitch)
            return
        }

        if (subscription.platform === "kick") {
            await subscription.listener.stop(options.kick)
            return
        }

        await subscription.listener.stop()
    }

    private async cleanupStartedSubscriptions(
        results: readonly PromiseSettledResult<
            | MultiPlatformYoutubeChatStartResult
            | MultiPlatformTwitchChatStartResult
            | MultiPlatformKickChatStartResult
        >[],
    ): Promise<void> {
        await Promise.all(
            results.map((result, index) => {
                if (result.status !== "fulfilled") {
                    return Promise.resolve()
                }

                return this.stopSubscription(this.subscriptions[index], {
                    twitch: { unsubscribe: true },
                    kick: { unsubscribe: true },
                })
            }),
        )
    }
}

async function readRawBody(request: AsyncIterable<Uint8Array | string>) {
    const decoder = new TextDecoder()
    let rawBody = ""

    for await (const chunk of request) {
        rawBody +=
            typeof chunk === "string"
                ? chunk
                : decoder.decode(chunk, { stream: true })
    }

    return rawBody + decoder.decode()
}
