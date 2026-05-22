import type { ChannelMetrics as SharedChannelMetrics, ChannelMetricsRequest as SharedChannelMetricsRequest, ChatListener, ChatMessage as SharedChatMessage } from "../../types.js";
/**
 * Configuration required to create a Twitch provider client.
 */
export type TwitchClientConfig = {
    /**
     * Twitch application client id.
     */
    clientId: string | undefined;
    /**
     * Twitch access token.
     *
     * `channels.resolve()` works with an app or user access token.
     * `channels.getMetrics()` for follower counts requires a user access token.
     * `chat.listen()` requires a user access token with `user:read:chat`.
     */
    accessToken: string | undefined;
};
/**
 * Twitch-supported public channel metrics.
 */
export type TwitchChannelMetric = "followers";
export type ChannelMetricsRequest = Omit<SharedChannelMetricsRequest, "metrics"> & {
    /**
     * Twitch broadcaster id.
     */
    channelId: string;
    metrics: TwitchChannelMetric[];
};
/**
 * Normalized channel metrics returned by the Twitch provider.
 */
export type ChannelMetrics = SharedChannelMetrics<"twitch">;
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
   */
    resolve(request: TwitchChannelResolveRequest): Promise<TwitchChannelResolveResult>;
    /**
   * Fetch normalized channel metrics from the Twitch Helix API.
   */
    getMetrics(request: ChannelMetricsRequest): Promise<ChannelMetrics>;
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
     */
    listen(request: TwitchChatListenRequest): TwitchChatListener;
};
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
     * Chat-related methods.
     */
    chat: TwitchChatClient;
};
