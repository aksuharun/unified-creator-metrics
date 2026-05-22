import type {
    ChannelMetrics as SharedChannelMetrics,
    ChannelMetricsRequest as SharedChannelMetricsRequest,
    ChatListener,
    ChatMessage as SharedChatMessage,
    VideoMetrics as SharedVideoMetrics,
    VideoMetricsRequest as SharedVideoMetricsRequest,
    SendMessageResult,
} from "../../types.js"
import type { GoogleYoutubeAuthClient } from "./google-client.js"

/**
 * Configuration required to create a YouTube provider client.
 */
export type YoutubeClientConfig = {
    /**
     * YouTube Data API key. Required for read-only endpoints if auth client/access token is not provided.
     */
    apiKey?: string

    /**
     * Pre-configured OAuth2 Client or auth client instance. Required for write operations like sending messages.
     */
    oauth2Client?: GoogleYoutubeAuthClient

    /**
     * Raw OAuth 2.0 access token string.
     */
    accessToken?: string
}

/**
 * YouTube-supported public channel metrics.
 */
export type YoutubeChannelMetric = "followers" | "views"

/**
 * YouTube-supported public video metrics.
 */
export type YoutubeVideoMetric = "likes" | "views" | "concurrentViewers"

export type ChannelMetricsRequest = Omit<SharedChannelMetricsRequest, "metrics"> & {
    metrics: YoutubeChannelMetric[]
}

/**
 * Normalized channel metrics returned by the YouTube provider.
 */
export type ChannelMetrics = SharedChannelMetrics<"youtube">

export type VideoMetricsRequest = Omit<SharedVideoMetricsRequest, "metrics"> & {
    metrics: YoutubeVideoMetric[]
}

/**
 * Normalized video metrics returned by the YouTube provider.
 */
export type VideoMetrics = SharedVideoMetrics<"youtube">

/**
 * Request to resolve a YouTube channel id from a public handle.
 */
export type YoutubeChannelResolveRequest = {
    /**
     * YouTube channel handle, with or without the leading `@`.
     */
    handle: string

    /**
     * Include the provider-native response when supported.
     */
    includeRaw?: boolean
}

/**
 * Resolved YouTube channel identity.
 */
export type YoutubeChannelResolveResult = {
    /**
     * Source platform identifier.
     */
    platform: "youtube"

    /**
     * Resolved YouTube channel id.
     */
    channelId: string

    /**
     * Normalized YouTube handle used for the lookup.
     */
    handle: string

    /**
     * Human-readable channel title when available.
     */
    displayName: string | null

    /**
     * ISO timestamp for when the identity was resolved.
     */
    fetchedAt: string

    /**
     * Raw provider response, only present when `includeRaw` is true.
     */
    raw?: unknown
}

/**
 * YouTube channel metric methods.
 */
export type YoutubeChannelsClient = {
    /**
   * Resolve a YouTube channel id from a public handle.
   */
    resolve(
        request: YoutubeChannelResolveRequest,
    ): Promise<YoutubeChannelResolveResult>

    /**
   * Fetch normalized channel metrics from the YouTube Data API.
   */
    getMetrics(request: ChannelMetricsRequest): Promise<ChannelMetrics>
}

/**
 * YouTube video metric methods.
 */
export type YoutubeVideosClient = {
    /**
   * Fetch normalized video metrics from the YouTube Data API.
   */
    getMetrics(request: VideoMetricsRequest): Promise<VideoMetrics>
}

/**
 * Normalized YouTube chat message event.
 */
export type ChatMessage = SharedChatMessage<"youtube">

/**
 * Options for creating a YouTube chat listener.
 */
export type YoutubeChatListenRequest = {
    /**
   * YouTube livestream video id. Used to resolve the active live chat id.
   */
    liveVideoId?: string

    /**
   * YouTube active live chat id. Use this to skip live video lookup.
   */
    liveChatId?: string

    /**
   * Minimum polling interval. YouTube's returned polling interval is respected
   * when it is higher.
   */
    pollingIntervalMs?: number

    /**
   * Maximum messages to request per poll.
   */
    maxResults?: number

    /**
   * Emit messages already present on the first fetch.
   */
    includeHistory?: boolean

    /**
     * Maximum number of recently seen live chat message ids to keep for
     * deduplication.
     */
    maxRecentMessageIds?: number

    /**
     * Include provider-native data on emitted messages.
     *
     * The resulting `message.raw` shape is intentionally not standardized
     * across platforms.
     */
    includeRaw?: boolean
}

/**
 * Setup details returned after starting a YouTube chat listener.
 */
export type YoutubeChatStartResult = {
    /**
     * Resolved YouTube live chat id used for polling.
     */
    liveChatId: string
    /**
     * Original live video id when the listener resolved the live chat from a
     * video, otherwise `null`.
     */
    liveVideoId: string | null
}

/**
 * YouTube chat listener.
 */
export type YoutubeChatListener = ChatListener<
    ChatMessage,
    YoutubeChatStartResult
>

/**
 * Request to send a text message to a YouTube live chat.
 */
export type YoutubeSendMessageRequest = {
    /**
     * YouTube active live chat id.
     */
    liveChatId: string

    /**
     * Message text to send.
     */
    text: string

    /**
     * Include the provider-native insert response on the result.
     */
    includeRaw?: boolean
}

/**
 * Normalized result returned after sending a YouTube chat message.
 */
export type YoutubeSendMessageResult = SendMessageResult<"youtube">

/**
 * YouTube chat event methods.
 */
export type YoutubeChatClient = {
    /**
   * Listen for normalized YouTube live chat message events.
   */
    listen(request: YoutubeChatListenRequest): YoutubeChatListener

    /**
     * Send a normalized text message to the specified YouTube live chat.
     */
    sendMessage(
        request: YoutubeSendMessageRequest,
    ): Promise<YoutubeSendMessageResult>
}

/**
 * YouTube provider client.
 */
export type YoutubeClient = {
    /**
   * Client platform identifier.
   */
    platform: "youtube"

    /**
   * Channel-related methods.
   */
    channels: YoutubeChannelsClient

    /**
     * Video-related methods.
   */
    videos: YoutubeVideosClient

    /**
   * Chat event methods.
   */
    chat: YoutubeChatClient
}
