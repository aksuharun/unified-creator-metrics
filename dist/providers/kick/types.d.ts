import type { ChatListener, ChatMessage as SharedChatMessage, VideoMetrics as SharedVideoMetrics, VideoMetricsRequest as SharedVideoMetricsRequest, DeleteMessageResult, BanUserResult, SendMessageResult, TimeoutUserResult, UnbanUserResult, Livestream, ActiveLivestreamsRequest } from "../../types.js";
import type { KickUserTokenUpdate } from "./auth.js";
export type { KickUserTokenUpdate } from "./auth.js";
/**
 * Configuration required to create a Kick provider client.
 */
export type KickClientConfig = {
    /**
     * OAuth app access token used for public and webhook-oriented features such
     * as `channels.resolve()`, `videos.getMetrics()`, and `chat.listen()`.
     */
    appAccessToken?: string;
    /**
     * OAuth user access token used for authenticated chat actions such as
     * `chat.sendMessage()`.
     */
    userAccessToken?: string;
    /**
     * Kick OAuth application client id.
     *
     * Required when `userRefreshToken` is provided.
     */
    clientId?: string;
    /**
     * Kick OAuth application client secret.
     *
     * Required when `userRefreshToken` is provided.
     */
    clientSecret?: string;
    /**
     * Kick OAuth refresh token used to obtain and rotate `userAccessToken`
     * automatically.
     */
    userRefreshToken?: string;
    /**
     * Called whenever the library refreshes the Kick user token pair.
     * Persist the returned refresh token because Kick may rotate it.
     */
    onUserTokenUpdate?: (tokens: KickUserTokenUpdate) => void | Promise<void>;
    /**
     * @deprecated Prefer `appAccessToken` and `userAccessToken`. When provided,
     * this value is used as a fallback for features that need either token kind.
     */
    accessToken?: string;
};
/**
 * Kick-supported public video metrics.
 */
export type KickVideoMetric = "concurrentViewers";
export type VideoMetricsRequest = Omit<SharedVideoMetricsRequest, "metrics"> & {
    /**
   * Kick channel slug for the active livestream.
   */
    videoId: string;
    metrics: KickVideoMetric[];
};
/**
 * Normalized video metrics returned by the Kick provider.
 */
export type VideoMetrics = SharedVideoMetrics<"kick">;
/**
 * Request to resolve a Kick broadcaster user id from a public channel slug.
 */
export type KickChannelResolveRequest = {
    /**
     * Kick channel slug.
     */
    slug: string;
    /**
     * Include the provider-native response when supported.
     */
    includeRaw?: boolean;
};
/**
 * Resolved Kick broadcaster identity.
 */
export type KickChannelResolveResult = {
    /**
     * Source platform identifier.
     */
    platform: "kick";
    /**
     * Resolved Kick broadcaster user id.
     */
    broadcasterUserId: number;
    /**
     * Normalized Kick channel slug used for the lookup.
     */
    slug: string;
    /**
     * Human-readable channel name when available.
     */
    displayName: string | null;
    /**
     * Profile image URL when available.
     */
    profilePictureUrl: string | null;
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
 * Kick channel methods.
 */
export type KickChannelsClient = {
    /**
     * Resolve a Kick broadcaster user id from a public channel slug.
     *
     * Requires `appAccessToken` on the provider config.
     */
    resolve(request: KickChannelResolveRequest): Promise<KickChannelResolveResult>;
    /**
     * Retrieve the authenticated user's Kick identity.
     *
     * Requires `userAccessToken` on the provider config.
     */
    getAuthenticatedUser(): Promise<KickChannelResolveResult>;
};
/**
 * Kick video metric methods.
 */
export type KickVideosClient = {
    /**
     * Fetch normalized livestream metrics from the Kick public API.
     *
     * Requires `appAccessToken` on the provider config.
     */
    getMetrics(request: VideoMetricsRequest): Promise<VideoMetrics>;
};
/**
 * Normalized Kick chat message event.
 */
export type ChatMessage = SharedChatMessage<"kick">;
/**
 * Strategy used by `start()` when managing the remote Kick webhook subscription.
 */
export type KickSubscriptionMode = "ensure" | "create" | "manual";
/**
 * Options for creating a Kick chat listener.
 */
export type KickChatListenRequest = {
    /**
   * Kick broadcaster user id. Required when the token is an app access token.
   */
    broadcasterUserId?: number;
    /**
     * Include provider-native data on emitted messages.
     *
     * The resulting `message.raw` shape is intentionally not standardized
     * across platforms.
     */
    includeRaw?: boolean;
    /**
     * Maximum number of recently seen webhook message ids to keep for
     * deduplication.
     */
    maxRecentMessageIds?: number;
    /**
   * How `start()` should handle the remote Kick event subscription.
   *
   * `ensure` reuses an existing chat subscription only when it matches the
   * configured webhook callback URL, otherwise it creates one.
   * `create` always creates a new subscription.
   * `manual` skips subscription management.
   */
    subscription?: KickSubscriptionMode;
    /**
     * Webhook validation options.
     */
    webhook?: {
        /**
     * Absolute callback URL expected to receive Kick webhook deliveries.
     *
     * Required when `subscription` is `ensure` so the listener can verify
     * that an existing remote subscription belongs to the current endpoint.
     */
        callbackUrl?: string;
        /**
     * Verify Kick webhook signatures. Defaults to true.
     */
        verifySignature?: boolean;
        /**
     * Optional Kick public key override. When omitted, the listener fetches and
     * caches the key from Kick.
     */
        publicKey?: string;
    };
};
/**
 * Remote Kick event subscription metadata.
 */
export type KickEventSubscription = {
    /**
     * Subscription id assigned by Kick.
     */
    id: string;
    /**
     * Provider-native event name, such as `chat.message.sent`.
     */
    event: string;
    /**
     * Provider event version.
     */
    version: number;
    /**
     * Delivery method reported by Kick.
     */
    method: string;
    /**
     * Webhook callback URL reported by Kick, when available.
     */
    callback_url?: string;
    /**
     * Broadcaster user id when available on the subscription record.
     */
    broadcaster_user_id?: number;
    /**
     * ISO timestamp for when the subscription was created, when provided.
     */
    created_at?: string;
    /**
     * ISO timestamp for when the subscription was last updated, when provided.
     */
    updated_at?: string;
    /**
     * Kick app id that owns the subscription, when provided.
     */
    app_id?: string;
};
/**
 * Setup details returned after starting a Kick chat listener.
 */
export type KickChatStartResult = {
    /**
     * Remote Kick subscriptions used by this listener.
     */
    subscriptions: readonly KickEventSubscription[];
};
/**
 * Header container accepted by Kick webhook helpers.
 */
export type KickWebhookHeaders = Headers | Record<string, string | string[] | undefined>;
/**
 * Raw webhook payload accepted by `handleWebhook()`.
 */
export type KickWebhookRequest = {
    /**
     * Incoming webhook headers.
     */
    headers: KickWebhookHeaders;
    /**
     * Exact raw request body string used for signature verification.
     */
    rawBody: string;
};
/**
 * Node-style incoming request shape accepted by `handleNodeWebhook()`.
 */
export type KickNodeWebhookRequest = AsyncIterable<Uint8Array | string> & {
    /**
     * Incoming webhook headers.
     */
    headers: KickWebhookHeaders;
};
/**
 * Result returned after a Kick webhook payload is parsed and processed.
 */
export type KickWebhookResult = {
    /**
     * Whether the payload was accepted as a valid Kick webhook request.
     */
    accepted: boolean;
    /**
     * Whether the webhook message id had already been processed.
     */
    duplicate: boolean;
    /**
     * Provider-native event type from the webhook headers.
     */
    eventType: string;
    /**
     * Normalized events emitted for this webhook payload.
     */
    emitted: readonly ["message"] | readonly [];
};
/**
 * Options for stopping a Kick chat listener.
 */
export type KickStopOptions = {
    /**
   * Delete remote subscriptions created by this listener.
   */
    unsubscribe?: boolean;
};
/**
 * Kick chat listener.
 */
export type KickChatListener = Omit<ChatListener<ChatMessage, KickChatStartResult>, "stop"> & {
    /**
     * Stop the listener transport.
     *
     * When `unsubscribe` is true, only subscriptions created by this listener
     * instance are deleted.
     */
    stop(options?: KickStopOptions): Promise<void>;
    /**
     * Handle a raw Kick webhook payload that was already read by the caller.
     */
    handleWebhook(request: KickWebhookRequest): Promise<KickWebhookResult>;
    /**
     * Read, verify, parse, and process a Kick webhook from a Node request-like
     * async iterable body.
     */
    handleNodeWebhook(request: KickNodeWebhookRequest): Promise<KickWebhookResult>;
};
/**
 * Kick chat sender identity.
 */
export type KickSendMessageType = "user" | "bot";
/**
 * Request to send a chat message as the authenticated user.
 */
export type KickSendUserMessageRequest = {
    /**
     * Send the message as the authenticated user. This is the default.
     */
    type?: Extract<KickSendMessageType, "user">;
    /**
     * Kick broadcaster user id for the destination channel.
     */
    broadcasterUserId: number;
    /**
     * Message text to send.
     */
    text: string;
    /**
     * Include the provider-native response on the result.
     */
    includeRaw?: boolean;
};
/**
 * Request to send a chat message as the authenticated bot.
 */
export type KickSendBotMessageRequest = {
    /**
     * Send the message as the authenticated bot.
     */
    type: Extract<KickSendMessageType, "bot">;
    /**
     * Message text to send.
     */
    text: string;
    /**
     * Include the provider-native response on the result.
     */
    includeRaw?: boolean;
};
/**
 * Request to send a Kick chat message.
 */
export type KickSendMessageRequest = KickSendUserMessageRequest | KickSendBotMessageRequest;
/**
 * Normalized result returned after sending a Kick chat message.
 */
export type KickSendMessageResult = SendMessageResult<"kick">;
export type KickDeleteMessageRequest = {
    messageId: string;
    includeRaw?: boolean;
};
export type KickDeleteMessageResult = DeleteMessageResult<"kick">;
export type KickBanUserRequest = {
    broadcasterUserId: number;
    userId: number;
    reason?: string;
    includeRaw?: boolean;
};
export type KickBanUserResult = BanUserResult<"kick">;
export type KickTimeoutUserRequest = {
    broadcasterUserId: number;
    userId: number;
    durationSeconds: number;
    reason?: string;
    includeRaw?: boolean;
};
export type KickTimeoutUserResult = TimeoutUserResult<"kick">;
export type KickUnbanUserRequest = {
    broadcasterUserId: number;
    userId: number;
    includeRaw?: boolean;
};
export type KickUnbanUserResult = UnbanUserResult<"kick">;
/**
 * Kick chat event methods.
 */
export type KickChatClient = {
    /**
     * Listen for normalized Kick chat message events.
     *
     * Requires `appAccessToken` on the provider config.
     */
    listen(request?: KickChatListenRequest): KickChatListener;
    /**
     * Send a normalized text message to the specified Kick channel chat.
     *
     * Requires `userAccessToken` on the provider config.
     */
    sendMessage(request: KickSendMessageRequest): Promise<KickSendMessageResult>;
    /**
     * Delete a specific Kick chat message.
     *
     * Requires `userAccessToken` on the provider config.
     */
    deleteMessage(request: KickDeleteMessageRequest): Promise<KickDeleteMessageResult>;
    /**
     * Permanently ban a user from a Kick chat room.
     *
     * Requires `userAccessToken` on the provider config.
     */
    banUser(request: KickBanUserRequest): Promise<KickBanUserResult>;
    /**
     * Temporarily ban a user from a Kick chat room.
     *
     * Requires `userAccessToken` on the provider config.
     */
    timeoutUser(request: KickTimeoutUserRequest): Promise<KickTimeoutUserResult>;
    /**
     * Remove a Kick ban or timeout for a user.
     *
     * Requires `userAccessToken` on the provider config.
     */
    unbanUser(request: KickUnbanUserRequest): Promise<KickUnbanUserResult>;
};
/** Kick active livestreams request. */
export type KickActiveLivestreamsRequest = ActiveLivestreamsRequest;
/** Kick livestreams client. */
export type KickLivestreamsClient = {
    /** Fetch active streams for a Kick channel. */
    getActive(request: KickActiveLivestreamsRequest): Promise<Livestream<"kick">[]>;
};
/**
 * Kick provider client.
 */
export type KickClient = {
    /**
   * Client platform identifier.
   */
    platform: "kick";
    /**
   * Channel-related methods.
   */
    channels: KickChannelsClient;
    /**
   * Video-related methods.
   */
    videos: KickVideosClient;
    /**
   * Chat event methods.
   */
    chat: KickChatClient;
    /**
     * Livestream-related methods.
     */
    livestreams: KickLivestreamsClient;
};
