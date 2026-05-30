import type { ChannelMetrics as SharedChannelMetrics, ChannelMetricsRequest as SharedChannelMetricsRequest, ChatListener, ChatMessage as SharedChatMessage, CreatePollRequest, CreatePollResult, VideoMetrics as SharedVideoMetrics, VideoMetricsRequest as SharedVideoMetricsRequest, DeleteMessageResult, EndPollRequest, EndPollResult, SendMessageResult, BanUserResult, TimeoutUserResult, UnbanUserResult } from "../../types.js";
import type { TwitchUserTokenUpdate } from "./auth.js";
export type { TwitchUserTokenUpdate } from "./auth.js";
/**
 * Configuration required to create a Twitch provider client.
 */
export type TwitchClientConfig = {
    /**
     * Twitch application client id.
     */
    clientId?: string;
    /**
     * Twitch application client secret.
     *
     * Required when `userRefreshToken` is provided.
     */
    clientSecret?: string;
    /**
     * Twitch app access token used for read-only application-authenticated
     * requests such as `channels.resolve()`.
     */
    appAccessToken?: string;
    /**
     * Twitch user access token used for user-authenticated features such as
     * `channels.getMetrics()` and `chat.listen()`.
     */
    userAccessToken?: string;
    /**
     * Twitch refresh token used to obtain and rotate `userAccessToken`
     * automatically.
     */
    userRefreshToken?: string;
    /**
     * Called whenever the library refreshes the Twitch user token pair.
     * Persist the returned refresh token because Twitch may rotate it.
     */
    onUserTokenUpdate?: (tokens: TwitchUserTokenUpdate) => void | Promise<void>;
    /**
     * @deprecated Prefer `appAccessToken` and `userAccessToken`. When provided,
     * this value is used as a fallback for features that need either token kind.
     */
    accessToken?: string;
};
/**
 * Twitch-supported public channel metrics.
 */
export type TwitchChannelMetric = "followers";
/**
 * Twitch-supported public video metrics.
 */
export type TwitchVideoMetric = "concurrentViewers";
export type ChannelMetricsRequest = Omit<SharedChannelMetricsRequest, "metrics"> & {
    /**
     * Twitch broadcaster id.
     */
    channelId: string;
    metrics: TwitchChannelMetric[];
};
export type VideoMetricsRequest = Omit<SharedVideoMetricsRequest, "metrics"> & {
    /**
     * Twitch broadcaster id used to look up the active livestream.
     */
    videoId: string;
    metrics: TwitchVideoMetric[];
};
/**
 * Normalized channel metrics returned by the Twitch provider.
 */
export type ChannelMetrics = SharedChannelMetrics<"twitch">;
/**
 * Normalized video metrics returned by the Twitch provider.
 */
export type VideoMetrics = SharedVideoMetrics<"twitch">;
/**
 * Request to create a Twitch poll.
 */
export type TwitchCreatePollRequest = CreatePollRequest & {
    /**
     * Twitch broadcaster id for the channel running the poll.
     */
    broadcasterId: string;
    /**
     * Poll duration in seconds. Twitch allows 15 to 1800 seconds.
     */
    durationSeconds: number;
    /**
     * Channel Points cost for each extra vote. When omitted, Channel Points
     * voting is disabled.
     */
    channelPointsPerVote?: number;
};
/**
 * Normalized result returned after creating a Twitch poll.
 */
export type TwitchCreatePollResult = CreatePollResult<"twitch">;
/**
 * Request to end a Twitch poll.
 */
export type TwitchEndPollRequest = EndPollRequest & {
    /**
     * Twitch broadcaster id for the channel running the poll.
     */
    broadcasterId: string;
    /**
     * Archive the poll after ending it so it is no longer publicly visible.
     */
    archive?: boolean;
};
/**
 * Normalized result returned after ending a Twitch poll.
 */
export type TwitchEndPollResult = EndPollResult<"twitch">;
/**
 * Twitch poll methods.
 */
export type TwitchPollsClient = {
    /**
     * Create a poll in the broadcaster's channel.
     *
     * Requires `userAccessToken` with the `channel:manage:polls` scope.
     */
    create(request: TwitchCreatePollRequest): Promise<TwitchCreatePollResult>;
    /**
     * End an active poll in the broadcaster's channel.
     *
     * Requires `userAccessToken` with the `channel:manage:polls` scope.
     */
    end(request: TwitchEndPollRequest): Promise<TwitchEndPollResult>;
};
/**
 * Request to resolve a Twitch broadcaster id from a login.
 */
export type TwitchChannelResolveRequest = {
    /**
     * Twitch broadcaster login name.
     */
    login: string;
    /**
     * Include the provider-native response when supported.
     */
    includeRaw?: boolean;
};
/**
 * Resolved Twitch broadcaster identity.
 */
export type TwitchChannelResolveResult = {
    /**
     * Source platform identifier.
     */
    platform: "twitch";
    /**
     * Resolved Twitch broadcaster id.
     */
    broadcasterId: string;
    /**
     * Normalized login used for the lookup.
     */
    login: string;
    /**
     * Human-readable display name when available.
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
 * Twitch channel methods.
 */
export type TwitchChannelsClient = {
    /**
     * Resolve a Twitch broadcaster id from a login.
     *
     * Requires `appAccessToken` or `userAccessToken` on the provider config.
     */
    resolve(request: TwitchChannelResolveRequest): Promise<TwitchChannelResolveResult>;
    /**
     * Fetch normalized channel metrics from the Twitch Helix API.
     *
     * Requires `userAccessToken` on the provider config.
     */
    getMetrics(request: ChannelMetricsRequest): Promise<ChannelMetrics>;
};
/**
 * Twitch video metric methods.
 */
export type TwitchVideosClient = {
    /**
     * Fetch normalized livestream metrics from the Twitch Helix Streams API.
     *
     * Accepts a Twitch broadcaster id in `videoId` and returns
     * `concurrentViewers` for the active stream when live.
     *
     * Requires `appAccessToken` or `userAccessToken` on the provider config.
     */
    getMetrics(request: VideoMetricsRequest): Promise<VideoMetrics>;
};
/**
 * Normalized Twitch chat message event.
 */
export type ChatMessage = SharedChatMessage<"twitch">;
/**
 * Options for creating a Twitch chat listener.
 */
export type TwitchChatListenRequest = {
    /**
     * Twitch broadcaster id for the channel to watch.
     */
    broadcasterId: string;
    /**
     * Include provider-native data on emitted messages.
     *
     * The resulting `message.raw` shape is intentionally not standardized
     * across platforms.
     */
    includeRaw?: boolean;
    /**
     * Maximum number of recently seen transport message ids to keep for
     * deduplication.
     */
    maxRecentMessageIds?: number;
    /**
     * Optional EventSub WebSocket URL override for tests and debugging.
     */
    websocketUrl?: string;
    /**
     * Optional EventSub keepalive timeout override, in seconds.
     */
    keepaliveTimeoutSeconds?: number;
};
/**
 * Remote Twitch EventSub subscription metadata.
 */
export type TwitchEventSubscription = {
    /**
     * Subscription id assigned by Twitch.
     */
    id: string;
    /**
     * Provider-native subscription status.
     */
    status: string;
    /**
     * Provider-native subscription type.
     */
    type: string;
    /**
     * Provider-native subscription version.
     */
    version: string;
    /**
     * Subscription cost reported by Twitch.
     */
    cost: number | null;
    /**
     * Subscription condition reported by Twitch.
     */
    condition: {
        broadcasterUserId: string | null;
        userId: string | null;
    };
    /**
     * Transport metadata for the subscription.
     */
    transport: {
        method: string;
        sessionId: string | null;
    };
    /**
     * ISO timestamp for when the subscription was created.
     */
    createdAt: string;
};
/**
 * Setup details returned after starting a Twitch chat listener.
 */
export type TwitchChatStartResult = {
    /**
     * Twitch broadcaster id used for the subscription.
     */
    broadcasterId: string;
    /**
     * EventSub WebSocket session id.
     */
    sessionId: string;
    /**
     * Authenticated chat user id derived from the access token.
     */
    userId: string;
    /**
     * Remote Twitch subscriptions used by this listener.
     */
    subscriptions: readonly TwitchEventSubscription[];
};
/**
 * Options for stopping a Twitch chat listener.
 */
export type TwitchStopOptions = {
    /**
     * Delete subscriptions created by this listener instance.
     */
    unsubscribe?: boolean;
};
/**
 * Twitch chat listener.
 */
export type TwitchChatListener = Omit<ChatListener<ChatMessage, TwitchChatStartResult>, "stop"> & {
    stop(options?: TwitchStopOptions): Promise<void>;
};
/**
 * Twitch chat event methods.
 */
export type TwitchChatClient = {
    /**
     * Listen for normalized Twitch chat message events.
     *
     * Requires `userAccessToken` with the `user:read:chat` scope on the
     * provider config.
     */
    listen(request: TwitchChatListenRequest): TwitchChatListener;
    /**
     * Send a normalized text message to the specified Twitch chat room.
     *
     * Requires `userAccessToken` with the `user:write:chat` scope on the
     * provider config.
     */
    sendMessage(request: TwitchSendMessageRequest): Promise<TwitchSendMessageResult>;
    /**
     * Delete a specific Twitch chat message.
     *
     * Requires `userAccessToken` with the `moderator:manage:chat_messages`
     * scope on the provider config.
     */
    deleteMessage(request: TwitchDeleteMessageRequest): Promise<TwitchDeleteMessageResult>;
    /**
     * Permanently ban a user from a Twitch chat room.
     *
     * Requires `userAccessToken` with the `moderator:manage:banned_users`
     * scope on the provider config.
     */
    banUser(request: TwitchBanUserRequest): Promise<TwitchBanUserResult>;
    /**
     * Temporarily ban a user from a Twitch chat room.
     *
     * Requires `userAccessToken` with the `moderator:manage:banned_users`
     * scope on the provider config.
     */
    timeoutUser(request: TwitchTimeoutUserRequest): Promise<TwitchTimeoutUserResult>;
    /**
     * Remove a Twitch ban or timeout for a user.
     *
     * Requires `userAccessToken` with the `moderator:manage:banned_users`
     * scope on the provider config.
     */
    unbanUser(request: TwitchUnbanUserRequest): Promise<TwitchUnbanUserResult>;
};
export type TwitchSendMessageRequest = {
    /**
     * Twitch broadcaster id for the destination chat room.
     */
    broadcasterId: string;
    /**
     * Message text to send.
     */
    text: string;
    /**
     * Optional Twitch parent message id when sending a reply.
     */
    replyParentMessageId?: string;
    /**
     * Include the provider-native response on the result.
     */
    includeRaw?: boolean;
};
export type TwitchSendMessageResult = SendMessageResult<"twitch">;
export type TwitchDeleteMessageRequest = {
    broadcasterId: string;
    messageId: string;
    includeRaw?: boolean;
};
export type TwitchDeleteMessageResult = DeleteMessageResult<"twitch">;
export type TwitchBanUserRequest = {
    broadcasterId: string;
    userId: string;
    reason?: string;
    includeRaw?: boolean;
};
export type TwitchBanUserResult = BanUserResult<"twitch">;
export type TwitchTimeoutUserRequest = {
    broadcasterId: string;
    userId: string;
    durationSeconds: number;
    reason?: string;
    includeRaw?: boolean;
};
export type TwitchTimeoutUserResult = TimeoutUserResult<"twitch">;
export type TwitchUnbanUserRequest = {
    broadcasterId: string;
    userId: string;
    includeRaw?: boolean;
};
export type TwitchUnbanUserResult = UnbanUserResult<"twitch">;
/**
 * Twitch provider client.
 */
export type TwitchClient = {
    /**
     * Client platform identifier.
     */
    platform: "twitch";
    /**
     * Channel-related methods.
     */
    channels: TwitchChannelsClient;
    /**
     * Video-related methods.
     */
    videos: TwitchVideosClient;
    /**
     * Poll-related methods.
     */
    polls: TwitchPollsClient;
    /**
     * Chat-related methods.
     */
    chat: TwitchChatClient;
};
