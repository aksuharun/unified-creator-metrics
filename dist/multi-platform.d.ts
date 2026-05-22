import type { KickChannelResolveRequest, KickChannelResolveResult, KickChatStartResult, KickClient, KickChatListenRequest, KickNodeWebhookRequest, KickSendMessageRequest, KickStopOptions, KickWebhookRequest, KickWebhookResult, VideoMetricsRequest as KickVideoMetricsRequest } from "./providers/kick/types.js";
import type { ChannelMetricsRequest as TwitchChannelMetricsRequest, TwitchChatListenRequest, TwitchChatStartResult, TwitchChannelResolveRequest, TwitchChannelResolveResult, TwitchClient, TwitchStopOptions } from "./providers/twitch/types.js";
import type { ChannelMetrics, ChatListener, ChatMessage, Platform, SendMessageResult, VideoMetrics } from "./types.js";
import type { ChannelMetricsRequest as YoutubeChannelMetricsRequest, YoutubeChannelResolveRequest, YoutubeChannelResolveResult, YoutubeChatListenRequest, YoutubeSendMessageRequest, YoutubeChatStartResult, VideoMetricsRequest as YoutubeVideoMetricsRequest, YoutubeClient } from "./providers/youtube/types.js";
/**
 * Provider clients available to the multi-platform router.
 */
export type MultiPlatformClientConfig = {
    /**
   * YouTube provider client.
   */
    youtube?: YoutubeClient;
    /**
   * Twitch provider client.
   */
    twitch?: TwitchClient;
    /**
   * Kick provider client.
   */
    kick?: KickClient;
};
/**
 * Request for normalized YouTube channel metrics through the multi-platform router.
 */
export type MultiPlatformYoutubeChannelMetricsRequest = YoutubeChannelMetricsRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "youtube">;
};
/**
 * Request for normalized Twitch channel metrics through the multi-platform router.
 */
export type MultiPlatformTwitchChannelMetricsRequest = TwitchChannelMetricsRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformChannelMetricsRequest = MultiPlatformYoutubeChannelMetricsRequest | MultiPlatformTwitchChannelMetricsRequest;
export type MultiPlatformChannelMetricsBatchRequest = readonly MultiPlatformChannelMetricsRequest[];
export type MultiPlatformYoutubeChannelResolveRequest = YoutubeChannelResolveRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickChannelResolveRequest = KickChannelResolveRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchChannelResolveRequest = TwitchChannelResolveRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformChannelResolveRequest = MultiPlatformYoutubeChannelResolveRequest | MultiPlatformTwitchChannelResolveRequest | MultiPlatformKickChannelResolveRequest;
export type MultiPlatformChannelResolveResult = YoutubeChannelResolveResult | TwitchChannelResolveResult | KickChannelResolveResult;
/**
 * Request for normalized video metrics through the multi-platform router.
 */
export type MultiPlatformYoutubeVideoMetricsRequest = YoutubeVideoMetricsRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickVideoMetricsRequest = KickVideoMetricsRequest & {
    /**
   * Platform to route the request to.
   */
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformVideoMetricsRequest = MultiPlatformYoutubeVideoMetricsRequest | MultiPlatformKickVideoMetricsRequest;
export type MultiPlatformVideoMetricsBatchRequest = readonly MultiPlatformVideoMetricsRequest[];
export type MultiPlatformYoutubeChatListenRequest = YoutubeChatListenRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickChatListenRequest = KickChatListenRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchChatListenRequest = TwitchChatListenRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformChatListenRequest = MultiPlatformYoutubeChatListenRequest | MultiPlatformTwitchChatListenRequest | MultiPlatformKickChatListenRequest;
export type MultiPlatformChatListenBatchRequest = readonly MultiPlatformChatListenRequest[];
export type MultiPlatformYoutubeSendMessageRequest = YoutubeSendMessageRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickSendMessageRequest = KickSendMessageRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformSendMessageRequest = MultiPlatformYoutubeSendMessageRequest | MultiPlatformKickSendMessageRequest;
export type MultiPlatformYoutubeChatStartResult = YoutubeChatStartResult & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickChatStartResult = KickChatStartResult & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchChatStartResult = TwitchChatStartResult & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformChatStartResult = readonly (MultiPlatformYoutubeChatStartResult | MultiPlatformTwitchChatStartResult | MultiPlatformKickChatStartResult)[];
export type MultiPlatformChatStopOptions = {
    twitch?: TwitchStopOptions;
    kick?: KickStopOptions;
};
export type MultiPlatformChatWebhookDispatchResult = {
    platform: Extract<Platform, "kick">;
    result: KickWebhookResult;
};
export type MultiPlatformChatListener = Omit<ChatListener<ChatMessage, MultiPlatformChatStartResult>, "stop"> & {
    stop(options?: MultiPlatformChatStopOptions): Promise<void>;
    handleWebhook(request: KickWebhookRequest): Promise<readonly MultiPlatformChatWebhookDispatchResult[]>;
    handleNodeWebhook(request: KickNodeWebhookRequest): Promise<readonly MultiPlatformChatWebhookDispatchResult[]>;
};
/**
 * Channel metric methods exposed by the multi-platform client.
 */
export type MultiPlatformChannelsClient = {
    /**
   * Route a provider-native channel identity lookup to the selected provider.
   */
    resolve(request: MultiPlatformChannelResolveRequest): Promise<MultiPlatformChannelResolveResult>;
    /**
   * Route a normalized channel metrics request to the selected provider.
   */
    getMetrics(request: MultiPlatformChannelMetricsRequest): Promise<ChannelMetrics>;
    getMetrics(request: MultiPlatformChannelMetricsBatchRequest): Promise<ChannelMetrics[]>;
};
/**
 * Video metric methods exposed by the multi-platform client.
 */
export type MultiPlatformVideosClient = {
    /**
   * Route a normalized video metrics request to the selected provider.
   */
    getMetrics(request: MultiPlatformVideoMetricsRequest): Promise<VideoMetrics>;
    getMetrics(request: MultiPlatformVideoMetricsBatchRequest): Promise<VideoMetrics[]>;
};
export type MultiPlatformChatsClient = {
    listen(request: MultiPlatformChatListenRequest | MultiPlatformChatListenBatchRequest): MultiPlatformChatListener;
    /**
     * Route a standardized text message to the selected provider.
     */
    sendMessage(request: MultiPlatformSendMessageRequest): Promise<SendMessageResult>;
};
/**
 * Client that exposes one normalized API across configured providers.
 */
export type MultiPlatformClient = {
    /**
   * Channel-related methods.
   */
    channels: MultiPlatformChannelsClient;
    /**
   * Video-related methods.
   */
    videos: MultiPlatformVideosClient;
    /**
   * Chat-related methods.
   */
    chats: MultiPlatformChatsClient;
};
/**
 * Create a client that routes normalized requests to provider-specific clients.
 *
 * The multi-platform client does not own provider credentials. It composes
 * provider clients that can also be used directly.
 */
export declare function createMultiPlatformClient(config: MultiPlatformClientConfig): MultiPlatformClient;
