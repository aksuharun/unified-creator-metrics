import type { ChannelMetrics as SharedChannelMetrics, ChannelMetricsRequest as SharedChannelMetricsRequest, CreatePollRequest, CreatePollResult, DeleteMessageResult, EndPollRequest, EndPollResult, BanUserResult, ChatListener, ChatMessage as SharedChatMessage, TimeoutUserResult, UnbanUserResult, VideoMetrics as SharedVideoMetrics, VideoMetricsRequest as SharedVideoMetricsRequest, SendMessageResult } from "../../types.js";
import type { GoogleYoutubeAuthClient } from "./google-client.js";
import type { YoutubeTokenRefreshResult } from "./auth.js";
export type { YoutubeTokenRefreshResult } from "./auth.js";
/**
 * Configuration required to create a YouTube provider client.
 */
export type YoutubeClientConfig = {
    /**
     * YouTube Data API key. Required for read-only endpoints if auth client/access token is not provided.
     */
    apiKey?: string;
    /**
     * Pre-configured OAuth2 Client or auth client instance. Required for write operations like sending messages.
     */
    oauth2Client?: GoogleYoutubeAuthClient;
    /**
     * Raw OAuth 2.0 access token string.
     */
    accessToken?: string;
    /**
     * Google OAuth application client id.
     *
     * Required together with `clientSecret` when `refreshToken` is provided.
     */
    clientId?: string;
    /**
     * Google OAuth application client secret.
     *
     * Required together with `clientId` when `refreshToken` is provided.
     */
    clientSecret?: string;
    /**
     * Google OAuth refresh token used to obtain new YouTube access tokens
     * without an interactive login.
     */
    refreshToken?: string;
    /**
     * Called whenever the internally managed Google OAuth client receives new
     * token material.
     */
    onTokenUpdate?: (tokens: YoutubeTokenRefreshResult) => void | Promise<void>;
};
/**
 * YouTube-supported public channel metrics.
 */
export type YoutubeChannelMetric = "followers" | "views";
/**
 * YouTube-supported public video metrics.
 */
export type YoutubeVideoMetric = "likes" | "views" | "concurrentViewers";
export type ChannelMetricsRequest = Omit<SharedChannelMetricsRequest, "metrics"> & {
    metrics: YoutubeChannelMetric[];
};
/**
 * Normalized channel metrics returned by the YouTube provider.
 */
export type ChannelMetrics = SharedChannelMetrics<"youtube">;
export type VideoMetricsRequest = Omit<SharedVideoMetricsRequest, "metrics"> & {
    metrics: YoutubeVideoMetric[];
};
/**
 * Normalized video metrics returned by the YouTube provider.
 */
export type VideoMetrics = SharedVideoMetrics<"youtube">;
/**
 * Request to create a YouTube live chat poll.
 */
export type YoutubeCreatePollRequest = CreatePollRequest & {
    /**
     * YouTube active live chat id.
     */
    liveChatId: string;
};
/**
 * Normalized result returned after creating a YouTube live chat poll.
 */
export type YoutubeCreatePollResult = CreatePollResult<"youtube">;
/**
 * Request to end a YouTube live chat poll.
 */
export type YoutubeEndPollRequest = EndPollRequest;
/**
 * Normalized result returned after ending a YouTube live chat poll.
 */
export type YoutubeEndPollResult = EndPollResult<"youtube">;
/**
 * YouTube poll methods.
 */
export type YoutubePollsClient = {
    /**
     * Create a poll in the specified YouTube live chat.
     */
    create(request: YoutubeCreatePollRequest): Promise<YoutubeCreatePollResult>;
    /**
     * Close an active YouTube live chat poll.
     */
    end(request: YoutubeEndPollRequest): Promise<YoutubeEndPollResult>;
};
/**
 * Request to resolve a YouTube channel id from a public handle.
 */
export type YoutubeChannelResolveRequest = {
    /**
     * YouTube channel handle, with or without the leading `@`.
     */
    handle: string;
    /**
     * Include the provider-native response when supported.
     */
    includeRaw?: boolean;
};
/**
 * Resolved YouTube channel identity.
 */
export type YoutubeChannelResolveResult = {
    /**
     * Source platform identifier.
     */
    platform: "youtube";
    /**
     * Resolved YouTube channel id.
     */
    channelId: string;
    /**
     * Normalized YouTube handle used for the lookup.
     */
    handle: string;
    /**
     * Human-readable channel title when available.
     */
    displayName: string | null;
    /**
     * ISO timestamp for when the identity was resolved.
     */
    fetchedAt: string;
    /**
     * Raw provider response, only present when `includeRaw` is true.
     */
    raw?: unknown;
};
/**
 * YouTube channel metric methods.
 */
export type YoutubeChannelsClient = {
    /**
   * Resolve a YouTube channel id from a public handle.
   */
    resolve(request: YoutubeChannelResolveRequest): Promise<YoutubeChannelResolveResult>;
    /**
   * Fetch normalized channel metrics from the YouTube Data API.
   */
    getMetrics(request: ChannelMetricsRequest): Promise<ChannelMetrics>;
};
/**
 * YouTube video metric methods.
 */
export type YoutubeVideosClient = {
    /**
   * Fetch normalized video metrics from the YouTube Data API.
   */
    getMetrics(request: VideoMetricsRequest): Promise<VideoMetrics>;
};
/**
 * Normalized YouTube chat message event.
 */
export type ChatMessage = SharedChatMessage<"youtube">;
/**
 * Options for creating a YouTube chat listener.
 */
export type YoutubeChatListenRequest = {
    /**
   * YouTube livestream video id. Used to resolve the active live chat id.
   */
    liveVideoId?: string;
    /**
   * YouTube active live chat id. Use this to skip live video lookup.
   */
    liveChatId?: string;
    /**
   * Minimum polling interval. YouTube's returned polling interval is respected
   * when it is higher.
   */
    pollingIntervalMs?: number;
    /**
   * Maximum messages to request per poll.
   */
    maxResults?: number;
    /**
   * Emit messages already present on the first fetch.
   */
    includeHistory?: boolean;
    /**
     * Maximum number of recently seen live chat message ids to keep for
     * deduplication.
     */
    maxRecentMessageIds?: number;
    /**
     * Include provider-native data on emitted messages.
     *
     * The resulting `message.raw` shape is intentionally not standardized
     * across platforms.
     */
    includeRaw?: boolean;
};
/**
 * Setup details returned after starting a YouTube chat listener.
 */
export type YoutubeChatStartResult = {
    /**
     * Resolved YouTube live chat id used for polling.
     */
    liveChatId: string;
    /**
     * Original live video id when the listener resolved the live chat from a
     * video, otherwise `null`.
     */
    liveVideoId: string | null;
};
/**
 * YouTube chat listener.
 */
export type YoutubeChatListener = ChatListener<ChatMessage, YoutubeChatStartResult>;
/**
 * Request to send a text message to a YouTube live chat.
 */
export type YoutubeSendMessageRequest = {
    /**
     * YouTube active live chat id.
     */
    liveChatId: string;
    /**
     * Message text to send.
     */
    text: string;
    /**
     * Include the provider-native insert response on the result.
     */
    includeRaw?: boolean;
};
/**
 * Normalized result returned after sending a YouTube chat message.
 */
export type YoutubeSendMessageResult = SendMessageResult<"youtube">;
/**
 * Request to delete a YouTube live chat message.
 */
export type YoutubeDeleteMessageRequest = {
    /**
     * YouTube live chat message id.
     */
    messageId: string;
    /**
     * Include the provider-native delete response on the result.
     */
    includeRaw?: boolean;
};
export type YoutubeDeleteMessageResult = DeleteMessageResult<"youtube">;
/**
 * Request to permanently ban a user from a YouTube live chat.
 */
export type YoutubeBanUserRequest = {
    /**
     * YouTube active live chat id.
     */
    liveChatId: string;
    /**
     * YouTube channel id of the user to ban.
     */
    userId: string;
    /**
     * Include the provider-native insert response on the result.
     */
    includeRaw?: boolean;
};
export type YoutubeBanUserResult = BanUserResult<"youtube">;
/**
 * Request to temporarily ban a user from a YouTube live chat.
 */
export type YoutubeTimeoutUserRequest = {
    /**
     * YouTube active live chat id.
     */
    liveChatId: string;
    /**
     * YouTube channel id of the user to timeout.
     */
    userId: string;
    /**
     * Timeout duration in seconds.
     */
    durationSeconds: number;
    /**
     * Include the provider-native insert response on the result.
     */
    includeRaw?: boolean;
};
export type YoutubeTimeoutUserResult = TimeoutUserResult<"youtube">;
/**
 * Request to remove a YouTube live chat ban or timeout.
 */
export type YoutubeUnbanUserRequest = {
    /**
     * YouTube live chat ban id.
     */
    banId: string;
    /**
     * Include the provider-native delete response on the result.
     */
    includeRaw?: boolean;
};
export type YoutubeUnbanUserResult = UnbanUserResult<"youtube">;
/**
 * YouTube chat event methods.
 */
export type YoutubeChatClient = {
    /**
   * Listen for normalized YouTube live chat message events.
   */
    listen(request: YoutubeChatListenRequest): YoutubeChatListener;
    /**
     * Send a normalized text message to the specified YouTube live chat.
     */
    sendMessage(request: YoutubeSendMessageRequest): Promise<YoutubeSendMessageResult>;
    /**
     * Delete a previously sent YouTube live chat message.
     */
    deleteMessage(request: YoutubeDeleteMessageRequest): Promise<YoutubeDeleteMessageResult>;
    /**
     * Permanently ban a user from the specified YouTube live chat.
     */
    banUser(request: YoutubeBanUserRequest): Promise<YoutubeBanUserResult>;
    /**
     * Temporarily ban a user from the specified YouTube live chat.
     */
    timeoutUser(request: YoutubeTimeoutUserRequest): Promise<YoutubeTimeoutUserResult>;
    /**
     * Remove a previously created YouTube live chat ban or timeout.
     */
    unbanUser(request: YoutubeUnbanUserRequest): Promise<YoutubeUnbanUserResult>;
};
/**
 * YouTube provider client.
 */
export type YoutubeClient = {
    /**
   * Client platform identifier.
   */
    platform: "youtube";
    /**
   * Channel-related methods.
   */
    channels: YoutubeChannelsClient;
    /**
     * Video-related methods.
   */
    videos: YoutubeVideosClient;
    /**
     * Poll-related methods.
     */
    polls: YoutubePollsClient;
    /**
   * Chat event methods.
   */
    chat: YoutubeChatClient;
};
