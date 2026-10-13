import type { KickBanUserRequest, KickChannelResolveRequest, KickChannelResolveResult, KickChatStartResult, KickClient, KickChatListenRequest, KickDeleteMessageRequest, KickNodeWebhookRequest, KickSendMessageRequest, KickStopOptions, KickTimeoutUserRequest, KickUnbanUserRequest, KickWebhookRequest, KickWebhookResult, VideoMetricsRequest as KickVideoMetricsRequest, KickActiveLivestreamsRequest } from "./providers/kick/types.js";
import type { TwitchBanUserRequest, ChannelMetricsRequest as TwitchChannelMetricsRequest, TwitchCreatePollRequest, TwitchChatListenRequest, TwitchChatStartResult, TwitchChannelResolveRequest, TwitchChannelResolveResult, TwitchClient, TwitchDeleteMessageRequest, TwitchEndPollRequest, TwitchSendMessageRequest, TwitchStopOptions, TwitchTimeoutUserRequest, TwitchUnbanUserRequest, VideoMetricsRequest as TwitchVideoMetricsRequest, TwitchActiveLivestreamsRequest, TwitchScheduledLivestreamsRequest } from "./providers/twitch/types.js";
import type { BanUserResult, ChannelMetrics, ChatListener, ChatMessage, CreatePollResult, DeleteMessageResult, EndPollResult, Platform, SendMessageResult, TimeoutUserResult, UnbanUserResult, VideoMetrics, Livestream } from "./types.js";
import type { YoutubeBanUserRequest, ChannelMetricsRequest as YoutubeChannelMetricsRequest, YoutubeChannelResolveRequest, YoutubeChannelResolveResult, YoutubeChatListenRequest, YoutubeCreatePollRequest, YoutubeDeleteMessageRequest, YoutubeEndPollRequest, YoutubeSendMessageRequest, YoutubeChatStartResult, YoutubeTimeoutUserRequest, YoutubeUnbanUserRequest, VideoMetricsRequest as YoutubeVideoMetricsRequest, YoutubeClient, YoutubeActiveLivestreamsRequest, YoutubeScheduledLivestreamsRequest } from "./providers/youtube/types.js";
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
export type MultiPlatformYoutubeGetAuthenticatedUserRequest = {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformTwitchGetAuthenticatedUserRequest = {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformKickGetAuthenticatedUserRequest = {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformGetAuthenticatedUserRequest = MultiPlatformYoutubeGetAuthenticatedUserRequest | MultiPlatformTwitchGetAuthenticatedUserRequest | MultiPlatformKickGetAuthenticatedUserRequest;
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
export type MultiPlatformTwitchVideoMetricsRequest = TwitchVideoMetricsRequest & {
    /**
 * Platform to route the request to.
 */
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformVideoMetricsRequest = MultiPlatformYoutubeVideoMetricsRequest | MultiPlatformTwitchVideoMetricsRequest | MultiPlatformKickVideoMetricsRequest;
export type MultiPlatformVideoMetricsBatchRequest = readonly MultiPlatformVideoMetricsRequest[];
export type MultiPlatformYoutubeCreatePollRequest = YoutubeCreatePollRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformTwitchCreatePollRequest = TwitchCreatePollRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformCreatePollRequest = MultiPlatformYoutubeCreatePollRequest | MultiPlatformTwitchCreatePollRequest;
export type MultiPlatformYoutubeEndPollRequest = YoutubeEndPollRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformTwitchEndPollRequest = TwitchEndPollRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformEndPollRequest = MultiPlatformYoutubeEndPollRequest | MultiPlatformTwitchEndPollRequest;
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
export type MultiPlatformTwitchSendMessageRequest = TwitchSendMessageRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformSendMessageRequest = MultiPlatformYoutubeSendMessageRequest | MultiPlatformTwitchSendMessageRequest | MultiPlatformKickSendMessageRequest;
export type MultiPlatformYoutubeDeleteMessageRequest = YoutubeDeleteMessageRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickDeleteMessageRequest = KickDeleteMessageRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchDeleteMessageRequest = TwitchDeleteMessageRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformDeleteMessageRequest = MultiPlatformYoutubeDeleteMessageRequest | MultiPlatformTwitchDeleteMessageRequest | MultiPlatformKickDeleteMessageRequest;
export type MultiPlatformYoutubeBanUserRequest = YoutubeBanUserRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickBanUserRequest = KickBanUserRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchBanUserRequest = TwitchBanUserRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformBanUserRequest = MultiPlatformYoutubeBanUserRequest | MultiPlatformTwitchBanUserRequest | MultiPlatformKickBanUserRequest;
export type MultiPlatformYoutubeTimeoutUserRequest = YoutubeTimeoutUserRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickTimeoutUserRequest = KickTimeoutUserRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchTimeoutUserRequest = TwitchTimeoutUserRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformTimeoutUserRequest = MultiPlatformYoutubeTimeoutUserRequest | MultiPlatformTwitchTimeoutUserRequest | MultiPlatformKickTimeoutUserRequest;
export type MultiPlatformYoutubeUnbanUserRequest = YoutubeUnbanUserRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformKickUnbanUserRequest = KickUnbanUserRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformTwitchUnbanUserRequest = TwitchUnbanUserRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformUnbanUserRequest = MultiPlatformYoutubeUnbanUserRequest | MultiPlatformTwitchUnbanUserRequest | MultiPlatformKickUnbanUserRequest;
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
export type MultiPlatformYoutubeActiveLivestreamsRequest = YoutubeActiveLivestreamsRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformTwitchActiveLivestreamsRequest = TwitchActiveLivestreamsRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformKickActiveLivestreamsRequest = KickActiveLivestreamsRequest & {
    platform: Extract<Platform, "kick">;
};
export type MultiPlatformActiveLivestreamsRequest = MultiPlatformYoutubeActiveLivestreamsRequest | MultiPlatformTwitchActiveLivestreamsRequest | MultiPlatformKickActiveLivestreamsRequest;
export type MultiPlatformActiveLivestreamsBatchRequest = readonly MultiPlatformActiveLivestreamsRequest[];
export type MultiPlatformYoutubeScheduledLivestreamsRequest = YoutubeScheduledLivestreamsRequest & {
    platform: Extract<Platform, "youtube">;
};
export type MultiPlatformTwitchScheduledLivestreamsRequest = TwitchScheduledLivestreamsRequest & {
    platform: Extract<Platform, "twitch">;
};
export type MultiPlatformScheduledLivestreamsRequest = MultiPlatformYoutubeScheduledLivestreamsRequest | MultiPlatformTwitchScheduledLivestreamsRequest;
export type MultiPlatformScheduledLivestreamsBatchRequest = readonly MultiPlatformScheduledLivestreamsRequest[];
export type MultiPlatformLivestreamsClient = {
    getActive(request: MultiPlatformActiveLivestreamsRequest): Promise<Livestream[]>;
    getActive(request: MultiPlatformActiveLivestreamsBatchRequest): Promise<Livestream[][]>;
    getActive(request: MultiPlatformActiveLivestreamsRequest | MultiPlatformActiveLivestreamsBatchRequest): Promise<Livestream[] | Livestream[][]>;
    getScheduled(request: MultiPlatformScheduledLivestreamsRequest): Promise<Livestream[]>;
    getScheduled(request: MultiPlatformScheduledLivestreamsBatchRequest): Promise<Livestream[][]>;
    getScheduled(request: MultiPlatformScheduledLivestreamsRequest | MultiPlatformScheduledLivestreamsBatchRequest): Promise<Livestream[] | Livestream[][]>;
};
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
    /**
     * Retrieve the authenticated user's identity from the selected provider.
     */
    getAuthenticatedUser(request: MultiPlatformGetAuthenticatedUserRequest): Promise<MultiPlatformChannelResolveResult>;
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
/**
 * Poll methods exposed by the multi-platform client.
 */
export type MultiPlatformPollsClient = {
    /**
     * Route a normalized poll creation request to the selected provider.
     */
    create(request: MultiPlatformCreatePollRequest): Promise<CreatePollResult>;
    /**
     * Route a normalized poll end request to the selected provider.
     */
    end(request: MultiPlatformEndPollRequest): Promise<EndPollResult>;
};
export type MultiPlatformChatsClient = {
    listen(request: MultiPlatformChatListenRequest | MultiPlatformChatListenBatchRequest): MultiPlatformChatListener;
    /**
     * Route a standardized text message to the selected provider.
     */
    sendMessage(request: MultiPlatformSendMessageRequest): Promise<SendMessageResult>;
    deleteMessage(request: MultiPlatformDeleteMessageRequest): Promise<DeleteMessageResult>;
    banUser(request: MultiPlatformBanUserRequest): Promise<BanUserResult>;
    timeoutUser(request: MultiPlatformTimeoutUserRequest): Promise<TimeoutUserResult>;
    unbanUser(request: MultiPlatformUnbanUserRequest): Promise<UnbanUserResult>;
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
     * Poll-related methods.
     */
    polls: MultiPlatformPollsClient;
    /**
   * Chat-related methods.
   */
    chats: MultiPlatformChatsClient;
    /**
     * Livestream-related methods.
     */
    livestreams: MultiPlatformLivestreamsClient;
};
/**
 * Create a client that routes normalized requests to provider-specific clients.
 *
 * The multi-platform client does not own provider credentials. It composes
 * provider clients that can also be used directly.
 */
export declare function createMultiPlatformClient(config: MultiPlatformClientConfig): MultiPlatformClient;
