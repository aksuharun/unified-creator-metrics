/**
 * Supported platform identifiers for the normalized library surface.
 */
export type Platform = "youtube" | "twitch" | "kick"

/**
 * Normalized public channel metrics used across every provider client.
 *
 * Provider clients map these names to their native fields internally. For
 * example, YouTube maps `followers` to `subscriberCount`.
 */
export type ChannelMetric = "followers" | "views"

/**
 * Request for normalized channel metrics.
 */
export type ChannelMetricsRequest = {
    /**
   * Provider-specific channel id.
   */
    channelId: string

    /**
   * Normalized metrics to fetch.
   */
    metrics: ChannelMetric[]

    /**
   * Include the provider raw response when supported.
   */
    includeRaw?: boolean
}

/**
 * Normalized public video metrics used across every provider client.
 */
export type VideoMetric = "likes" | "views" | "concurrentViewers"

/**
 * Request for normalized video metrics.
 */
export type VideoMetricsRequest = {
    /**
   * Provider-specific video id.
   */
    videoId: string

    /**
   * Normalized metrics to fetch.
   */
    metrics: VideoMetric[]

    /**
   * Include the provider raw response when supported.
   */
    includeRaw?: boolean
}

/**
 * Normalized channel metrics returned by a provider.
 */
export type ChannelMetrics<TPlatform extends Platform = Platform> = {
    /**
   * Source platform identifier.
   */
    platform: TPlatform

    /**
   * Provider-specific channel id.
   */
    channelId: string

    /**
   * Human-readable channel name when available.
   */
    displayName: string | null

    /**
   * Normalized follower count.
   */
    followers: number | null

    /**
   * Normalized view count when available.
   */
    views: number | null

    /**
   * ISO timestamp for when the metric was normalized.
   */
    fetchedAt: string

    /**
   * Raw provider response, only present when `includeRaw` is true.
     */
    raw?: unknown
}

/**
 * Normalized video metrics returned by a provider.
 */
export type VideoMetrics<TPlatform extends Platform = Platform> = {
    /**
   * Source platform identifier.
   */
    platform: TPlatform

    /**
   * Provider-specific video id.
   */
    videoId: string

    /**
   * Human-readable video title when available.
   */
    title: string | null

    /**
   * Provider-specific channel id when available.
   */
    channelId: string | null

    /**
   * Human-readable channel name when available.
   */
    channelDisplayName: string | null

    /**
   * Normalized like count.
   */
    likes: number | null

    /**
   * Normalized view count.
   */
    views: number | null

    /**
   * Normalized concurrent viewer count for livestreams.
   */
    concurrentViewers: number | null

    /**
   * ISO timestamp for when the metric was normalized.
   */
    fetchedAt: string

    /**
   * Raw provider response, only present when `includeRaw` is true.
   */
    raw?: unknown
}

/**
 * Normalized public poll status values across supported providers.
 */
export type PollStatus =
    | "active"
    | "ended"
    | "unknown"

/**
 * Normalized reason describing how a poll ended when the provider exposes one.
 */
export type PollEndReason =
    | "completed"
    | "cancelled"
    | "archived"
    | "moderated"
    | "invalid"
    | "unknown"

/**
 * Normalized choice in a livestream poll.
 */
export type PollChoice = {
    /**
     * Provider-specific choice id when available.
     */
    id: string | null

    /**
     * Human-readable choice text.
     */
    text: string

    /**
     * Current vote tally when the provider returns it.
     */
    votes: number | null
}

/**
 * Shared request fields for creating a livestream poll.
 */
export type CreatePollRequest = {
    /**
     * Poll question shown to viewers.
     */
    question: string

    /**
     * Poll choices shown to viewers.
     */
    choices: string[]

    /**
     * Include the provider raw response when supported.
     */
    includeRaw?: boolean
}

/**
 * Shared request fields for ending an active livestream poll.
 */
export type EndPollRequest = {
    /**
     * Provider-specific poll id.
     */
    pollId: string

    /**
     * Include the provider raw response when supported.
     */
    includeRaw?: boolean
}

/**
 * Normalized poll returned by a provider.
 */
export type Poll<TPlatform extends Platform = Platform> = {
    /**
     * Source platform identifier.
     */
    platform: TPlatform

    /**
     * Provider-specific poll id.
     */
    pollId: string

    /**
     * Poll question shown to viewers.
     */
    question: string | null

    /**
     * Normalized poll choices.
     */
    choices: PollChoice[]

    /**
     * Normalized provider poll status.
     */
    status: PollStatus

    /**
     * Normalized reason the poll ended when known.
     */
    endReason: PollEndReason | null

    /**
     * Poll duration in seconds when the provider returns it.
     */
    durationSeconds: number | null

    /**
     * ISO timestamp for when the provider says the poll was created.
     */
    createdAt: string | null

    /**
     * ISO timestamp for when the poll ended when known.
     */
    endedAt: string | null

    /**
     * Raw provider response, only present when requested and supported.
     */
    raw?: unknown
}

/**
 * Result returned after successfully creating a livestream poll.
 */
export type CreatePollResult<TPlatform extends Platform = Platform> =
    Poll<TPlatform>

/**
 * Result returned after successfully ending a livestream poll.
 */
export type EndPollResult<TPlatform extends Platform = Platform> =
    Poll<TPlatform>

/**
 * Normalized chat message event emitted by provider chat listeners.
 */
export type ChatMessage<TPlatform extends Platform = Platform> = {
    /**
   * Source platform identifier.
   */
    platform: TPlatform

    /**
   * Normalized event type.
   */
    type: "message"

    /**
   * Provider-specific message id.
   */
    id: string

    /**
   * Human-readable chat message text.
   */
    text: string

    /**
   * ISO timestamp for when the provider says the message was sent.
   */
    sentAt: string

    /**
   * User or channel that sent the message.
   */
    author: {
        id: string | null
        username: string | null
        displayName: string | null
    }

    /**
   * Channel where the message was sent.
   */
    channel: {
        id: string | null
        slug: string | null
        displayName: string | null
    }

    /**
     * Provider-native event payload, only present when `includeRaw` is true.
     *
     * The shape of `raw` is intentionally platform-specific and may differ
     * across providers. Use the normalized top-level fields for cross-platform
     * logic.
     */
    raw?: unknown
}

/**
 * Handler invoked for each normalized chat message event.
 */
export type ChatEventHandler<TMessage extends ChatMessage = ChatMessage> = (
    message: TMessage,
) => void | Promise<void>

/**
 * Handler invoked when a listener encounters an asynchronous error.
 */
export type ChatErrorHandler = (error: unknown) => void | Promise<void>

/**
 * Shared listener contract for long-running chat event consumers.
 */
export type ChatListener<
    TMessage extends ChatMessage = ChatMessage,
    TStartResult = void,
> = {
    /**
     * Register a normalized chat message handler.
     */
    on(event: "message", handler: ChatEventHandler<TMessage>): ChatListener<
        TMessage,
        TStartResult
    >
    /**
     * Register an error handler for transport and callback failures.
     */
    on(
        event: "error",
        handler: ChatErrorHandler,
    ): ChatListener<TMessage, TStartResult>
    /**
     * Remove a previously registered message handler.
     */
    off(event: "message", handler: ChatEventHandler<TMessage>): ChatListener<
        TMessage,
        TStartResult
    >
    /**
     * Remove a previously registered error handler.
     */
    off(
        event: "error",
        handler: ChatErrorHandler,
    ): ChatListener<TMessage, TStartResult>
    /**
     * Start the listener transport and return provider-specific setup details.
     */
    start(): Promise<TStartResult>
    /**
     * Stop the listener transport. Registered handlers remain attached.
     */
    stop(): Promise<void>
}

/**
 * Result returned after successfully sending a chat message.
 */
export type SendMessageResult<TPlatform extends Platform = Platform> = {
    /**
     * Source platform identifier.
     */
    platform: TPlatform

    /**
     * Provider-specific unique identifier for the sent message.
     */
    messageId: string | null

    /**
     * ISO timestamp for when the provider says the message was created.
     */
    sentAt: string

    /**
     * Raw provider response, only present when requested and supported.
     */
    raw?: unknown
}

/**
 * Result returned after successfully deleting a chat message.
 */
export type DeleteMessageResult<TPlatform extends Platform = Platform> = {
    /**
     * Source platform identifier.
     */
    platform: TPlatform

    /**
     * Provider-specific unique identifier for the deleted message.
     */
    messageId: string

    /**
     * Raw provider response, only present when requested and supported.
     */
    raw?: unknown
}

type ModerationActionResult<TPlatform extends Platform = Platform> = {
    /**
     * Source platform identifier.
     */
    platform: TPlatform

    /**
     * Provider-specific unique identifier for the moderated user.
     */
    userId: string | null

    /**
     * Provider-specific unique identifier for the ban record when available.
     */
    banId: string | null

    /**
     * Raw provider response, only present when requested and supported.
     */
    raw?: unknown
}

/**
 * Result returned after successfully banning a user.
 */
export type BanUserResult<TPlatform extends Platform = Platform> =
    ModerationActionResult<TPlatform> & {
        /**
         * ISO timestamp for when the ban expires, or `null` for permanent bans.
         */
        expiresAt: string | null
    }

/**
 * Result returned after successfully timing out a user.
 */
export type TimeoutUserResult<TPlatform extends Platform = Platform> =
    ModerationActionResult<TPlatform> & {
        /**
         * Timeout duration in seconds.
         */
        durationSeconds: number

        /**
         * ISO timestamp for when the timeout expires.
         */
        expiresAt: string | null
    }

/**
 * Result returned after successfully removing a ban or timeout.
 */
export type UnbanUserResult<TPlatform extends Platform = Platform> =
    ModerationActionResult<TPlatform>
