import { ChatListenerEmitter } from "../../chat-listener.js"
import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { RecentIdTracker } from "../../recent-message-ids.js"
import type { ChatMessage } from "../../types.js"
import {
    createTwitchUserAccessTokenProvider,
    type TwitchUserAccessTokenProvider,
} from "./auth.js"
import { TWITCH_PLATFORM } from "./constants.js"
import type {
    TwitchBanUserRequest,
    TwitchBanUserResult,
    TwitchChatClient,
    TwitchChatListenRequest,
    TwitchChatListener,
    TwitchChatStartResult,
    TwitchDeleteMessageRequest,
    TwitchDeleteMessageResult,
    TwitchEventSubscription,
    TwitchSendMessageRequest,
    TwitchSendMessageResult,
    TwitchStopOptions,
    TwitchTimeoutUserRequest,
    TwitchTimeoutUserResult,
    TwitchUnbanUserRequest,
    TwitchUnbanUserResult,
} from "./types.js"

const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix"
const TWITCH_AUTH_BASE_URL = "https://id.twitch.tv/oauth2"
const TWITCH_EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws"
const TWITCH_CHAT_MESSAGE_EVENT = "channel.chat.message"
const TWITCH_CHAT_MESSAGE_EVENT_VERSION = "1"
const TWITCH_CHAT_SCOPE = "user:read:chat"
const TWITCH_CHAT_SEND_SCOPE = "user:write:chat"
const TWITCH_CHAT_MODERATION_SCOPE = "moderator:manage:chat_messages"
const TWITCH_BANNED_USERS_SCOPE = "moderator:manage:banned_users"
const DEFAULT_MAX_RECENT_IDS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

type TwitchChatClientOptions = {
    clientId: string
    userAccessToken?: string
    userAccessTokenProvider?: TwitchUserAccessTokenProvider
}

type TwitchTokenValidationResponse = {
    client_id?: string | null
    login?: string | null
    scopes?: string[] | null
    user_id?: string | null
}

type TwitchCreateSubscriptionResponse = {
    data?: TwitchEventSubscriptionPayload[]
}

type TwitchEventSubEnvelope = {
    metadata?: {
        message_id?: string | null
        message_type?: string | null
        message_timestamp?: string | null
        subscription_type?: string | null
        subscription_version?: string | null
    } | null
    payload?: {
        session?: TwitchSessionPayload | null
        subscription?: TwitchEventSubscriptionPayload | null
        event?: TwitchChatMessageEventPayload | null
    } | null
}

type TwitchSessionPayload = {
    id?: string | null
    keepalive_timeout_seconds?: number | null
    reconnect_url?: string | null
}

type TwitchEventSubscriptionPayload = {
    id?: string | null
    status?: string | null
    type?: string | null
    version?: string | null
    cost?: number | null
    condition?: {
        broadcaster_user_id?: string | null
        user_id?: string | null
    } | null
    transport?: {
        method?: string | null
        session_id?: string | null
    } | null
    created_at?: string | null
}

type TwitchChatMessageEventPayload = {
    broadcaster_user_id?: string | null
    broadcaster_user_login?: string | null
    broadcaster_user_name?: string | null
    chatter_user_id?: string | null
    chatter_user_login?: string | null
    chatter_user_name?: string | null
    message_id?: string | null
    message?: {
        text?: string | null
        fragments?: Array<{
            text?: string | null
        }> | null
    } | null
}

type TwitchValidatedUserToken = {
    userId: string
    login: string | null
}

type TwitchModerationBanResponse = {
    data?: Array<{
        user_id?: string | null
        created_at?: string | null
        end_time?: string | null
        expires_at?: string | null
    }>
}

type TwitchSendMessageResponse = {
    data?: Array<{
        message_id?: string | null
        is_sent?: boolean | null
        drop_reason?: unknown
    }>
}

/**
 * Create the Twitch chat capability object exposed as `twitch.chat`.
 */
export function createTwitchChatClient(
    options: TwitchChatClientOptions,
): TwitchChatClient {
    const userAccessTokenProvider =
        options.userAccessTokenProvider ??
        createTwitchUserAccessTokenProvider({
            accessToken: options.userAccessToken,
            clientId: options.clientId,
        })

    return {
        listen(request: TwitchChatListenRequest): TwitchChatListener {
            const resolvedUserAccessTokenProvider =
                requireTwitchUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.listen()",
                )

            return new TwitchChatListenerImpl(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                request,
            )
        },
        async sendMessage(
            request: TwitchSendMessageRequest,
        ): Promise<TwitchSendMessageResult> {
            validateTwitchSendMessageRequest(request)
            const resolvedUserAccessTokenProvider =
                requireTwitchUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.sendMessage()",
                )
            const validatedToken = await validateTwitchUserAccessToken(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    feature: "chat.sendMessage()",
                    requiredScopes: [TWITCH_CHAT_SEND_SCOPE],
                },
            )
            const payload = await twitchRequest<TwitchSendMessageResponse>(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                "/chat/messages",
                {
                    method: "POST",
                    body: JSON.stringify({
                        broadcaster_id: request.broadcasterId,
                        sender_id: validatedToken.userId,
                        message: request.text,
                        ...(request.replyParentMessageId
                            ? {
                                reply_parent_message_id:
                                    request.replyParentMessageId,
                            }
                            : {}),
                    }),
                },
            )
            const result = payload.data?.[0]

            if (!result) {
                throw new PlatformApiError(
                    "Twitch send message response did not include data[0].",
                    { platform: TWITCH_PLATFORM },
                )
            }

            if (result.is_sent !== true) {
                throw new PlatformApiError(
                    "Twitch accepted the chat message request but did not send it.",
                    { platform: TWITCH_PLATFORM, cause: result.drop_reason },
                )
            }

            return {
                platform: TWITCH_PLATFORM,
                messageId:
                    result.message_id == null ? null : String(result.message_id),
                sentAt: new Date().toISOString(),
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async deleteMessage(
            request: TwitchDeleteMessageRequest,
        ): Promise<TwitchDeleteMessageResult> {
            validateTwitchDeleteMessageRequest(request)
            const resolvedUserAccessTokenProvider =
                requireTwitchUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.deleteMessage()",
                )
            const validatedToken = await validateTwitchUserAccessToken(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    feature: "chat.deleteMessage()",
                    requiredScopes: [TWITCH_CHAT_MODERATION_SCOPE],
                },
            )
            const url = new URL(`${TWITCH_API_BASE_URL}/moderation/chat`)
            url.searchParams.set("broadcaster_id", request.broadcasterId)
            url.searchParams.set("moderator_id", validatedToken.userId)
            url.searchParams.set("message_id", request.messageId)

            const payload = await twitchRequest<unknown>(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                url,
                {
                    method: "DELETE",
                },
            )

            return {
                platform: TWITCH_PLATFORM,
                messageId: request.messageId,
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async banUser(
            request: TwitchBanUserRequest,
        ): Promise<TwitchBanUserResult> {
            validateTwitchBanUserRequest(request)
            const resolvedUserAccessTokenProvider =
                requireTwitchUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.banUser()",
                )
            const validatedToken = await validateTwitchUserAccessToken(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    feature: "chat.banUser()",
                    requiredScopes: [TWITCH_BANNED_USERS_SCOPE],
                },
            )

            const payload = await twitchModerationBanRequest(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    broadcasterId: request.broadcasterId,
                    moderatorId: validatedToken.userId,
                    userId: request.userId,
                    reason: request.reason,
                },
            )
            const result = payload.data?.[0]

            return {
                platform: TWITCH_PLATFORM,
                userId: result?.user_id ?? request.userId,
                banId: null,
                expiresAt: normalizeNullableDate(
                    result?.end_time ?? result?.expires_at ?? undefined,
                ),
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async timeoutUser(
            request: TwitchTimeoutUserRequest,
        ): Promise<TwitchTimeoutUserResult> {
            validateTwitchTimeoutUserRequest(request)
            const resolvedUserAccessTokenProvider =
                requireTwitchUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.timeoutUser()",
                )
            const validatedToken = await validateTwitchUserAccessToken(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    feature: "chat.timeoutUser()",
                    requiredScopes: [TWITCH_BANNED_USERS_SCOPE],
                },
            )

            const payload = await twitchModerationBanRequest(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    broadcasterId: request.broadcasterId,
                    moderatorId: validatedToken.userId,
                    userId: request.userId,
                    durationSeconds: request.durationSeconds,
                    reason: request.reason,
                },
            )
            const result = payload.data?.[0]

            return {
                platform: TWITCH_PLATFORM,
                userId: result?.user_id ?? request.userId,
                banId: null,
                durationSeconds: request.durationSeconds,
                expiresAt:
                    normalizeNullableDate(
                        result?.end_time ?? result?.expires_at ?? undefined,
                    ) ??
                    new Date(Date.now() + request.durationSeconds * 1000).toISOString(),
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async unbanUser(
            request: TwitchUnbanUserRequest,
        ): Promise<TwitchUnbanUserResult> {
            validateTwitchUnbanUserRequest(request)
            const resolvedUserAccessTokenProvider =
                requireTwitchUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.unbanUser()",
                )
            const validatedToken = await validateTwitchUserAccessToken(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                {
                    feature: "chat.unbanUser()",
                    requiredScopes: [TWITCH_BANNED_USERS_SCOPE],
                },
            )
            const url = new URL(`${TWITCH_API_BASE_URL}/moderation/bans`)
            url.searchParams.set("broadcaster_id", request.broadcasterId)
            url.searchParams.set("moderator_id", validatedToken.userId)
            url.searchParams.set("user_id", request.userId)

            const payload = await twitchRequest<unknown>(
                {
                    clientId: options.clientId,
                    userAccessTokenProvider: resolvedUserAccessTokenProvider,
                },
                url,
                {
                    method: "DELETE",
                },
            )

            return {
                platform: TWITCH_PLATFORM,
                userId: request.userId,
                banId: null,
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
    }
}

/**
 * Twitch chat listener implementation backed by EventSub WebSockets.
 */
class TwitchChatListenerImpl
    extends ChatListenerEmitter<ChatMessage<"twitch">, TwitchChatStartResult>
    implements TwitchChatListener {
    private readonly seenTransportMessageIds: RecentIdTracker
    private readonly createdSubscriptionIds = new Set<string>()
    private readonly includeRaw: boolean
    private readonly websocketUrl: string
    private subscriptions: TwitchEventSubscription[] = []
    private validatedToken?: TwitchValidatedUserToken
    private setup?: TwitchChatStartResult
    private socket?: WebSocket
    private startPromise?: Promise<TwitchChatStartResult>
    private keepaliveTimer?: ReturnType<typeof setTimeout>
    private reconnectTimer?: ReturnType<typeof setTimeout>
    private reconnectAttempt = 0
    private shouldRun = false
    private reconnectInProgress = false

    constructor(
        private readonly options: {
            clientId: string
            userAccessTokenProvider: TwitchUserAccessTokenProvider
        },
        private readonly request: TwitchChatListenRequest,
    ) {
        super()
        validateTwitchChatListenRequest(request)
        this.seenTransportMessageIds = new RecentIdTracker(
            request.maxRecentMessageIds ?? DEFAULT_MAX_RECENT_IDS,
        )
        this.includeRaw = request.includeRaw === true
        this.websocketUrl = buildWebSocketUrl(
            request.websocketUrl ?? TWITCH_EVENTSUB_WS_URL,
            request.keepaliveTimeoutSeconds,
        )
    }

    /**
     * Validate the token, connect to EventSub, and subscribe to chat events.
     */
    async start(): Promise<TwitchChatStartResult> {
        if (this.startPromise) {
            return this.startPromise
        }

        if (this.shouldRun && this.setup) {
            return this.setup
        }

        this.shouldRun = true
        this.startPromise = this.startInternal().finally(() => {
            this.startPromise = undefined
        })

        return this.startPromise
    }

    /**
     * Stop the active socket and optionally delete subscriptions created by
     * this listener instance.
     */
    async stop(options: TwitchStopOptions = {}): Promise<void> {
        this.shouldRun = false
        this.reconnectInProgress = false
        this.clearReconnectTimer()
        this.clearKeepaliveTimer()

        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            this.socket.close(1000, "Shutdown")
        }

        this.socket = undefined

        if (options.unsubscribe === true && this.createdSubscriptionIds.size > 0) {
            await this.deleteSubscriptions([...this.createdSubscriptionIds])
            this.createdSubscriptionIds.clear()
        }

        await super.stop()
    }

    private async startInternal(): Promise<TwitchChatStartResult> {
        try {
            this.validatedToken = await validateTwitchUserAccessToken(this.options, {
                feature: "chat.listen()",
                requiredScopes: [TWITCH_CHAT_SCOPE],
            })
            this.setup = await this.connect({
                url: this.websocketUrl,
                shouldCreateSubscription: true,
            })
            this.reconnectAttempt = 0

            return this.setup
        } catch (error) {
            this.shouldRun = false
            this.socket = undefined
            this.clearKeepaliveTimer()
            throw error
        }
    }

    /**
     * Open an EventSub socket and wait for the welcome message. When requested,
     * create the `channel.chat.message` subscription for the socket session.
     */
    private async connect(options: {
        url: string
        shouldCreateSubscription: boolean
    }): Promise<TwitchChatStartResult> {
        return new Promise<TwitchChatStartResult>((resolve, reject) => {
            let settled = false
            const socket = new WebSocket(options.url)
            this.socket = socket

            const rejectOnce = (error: unknown) => {
                if (settled) {
                    this.emitError(error)
                    return
                }

                settled = true
                reject(error)
            }

            socket.addEventListener("message", (event) => {
                void this.handleSocketMessage({
                    socket,
                    event,
                    shouldCreateSubscription: options.shouldCreateSubscription,
                    resolve: (result) => {
                        if (!settled) {
                            settled = true
                            resolve(result)
                        }
                    },
                    reject: rejectOnce,
                })
            })

            socket.addEventListener("error", () => {
                rejectOnce(
                    new PlatformApiError(
                        "Twitch EventSub WebSocket connection failed.",
                        { platform: TWITCH_PLATFORM },
                    ),
                )
            })

            socket.addEventListener("close", (event) => {
                if (this.socket === socket) {
                    this.socket = undefined
                    this.clearKeepaliveTimer()
                }

                if (this.socket !== socket && settled) {
                    return
                }

                if (!settled) {
                    settled = true
                    reject(
                        new PlatformApiError(
                            `Twitch EventSub WebSocket closed with code ${event.code}.`,
                            {
                                platform: TWITCH_PLATFORM,
                                status:
                                    typeof event.code === "number"
                                        ? event.code
                                        : undefined,
                            },
                        ),
                    )
                    return
                }

                if (!this.shouldRun || this.reconnectInProgress) {
                    return
                }

                this.scheduleReconnect()
            })
        })
    }

    /**
     * Handle a single EventSub WebSocket frame.
     */
    private async handleSocketMessage(options: {
        socket: WebSocket
        event: MessageEvent
        shouldCreateSubscription: boolean
        resolve: (result: TwitchChatStartResult) => void
        reject: (error: unknown) => void
    }): Promise<void> {
        let payload: TwitchEventSubEnvelope

        try {
            payload = JSON.parse(String(options.event.data)) as TwitchEventSubEnvelope
        } catch {
            options.reject(
                new PlatformValidationError(
                    "Twitch EventSub WebSocket payload was not valid JSON.",
                    { platform: TWITCH_PLATFORM },
                ),
            )
            return
        }

        const metadata = payload.metadata ?? {}
        const messageType = metadata.message_type

        if (messageType === "session_welcome") {
            try {
                const session = payload.payload?.session
                const sessionId = session?.id

                if (!sessionId) {
                    throw new PlatformApiError(
                        "Twitch EventSub welcome payload did not include session.id.",
                        { platform: TWITCH_PLATFORM },
                    )
                }

                this.resetKeepaliveTimer(session?.keepalive_timeout_seconds ?? undefined)

                if (options.shouldCreateSubscription) {
                    const subscription = await this.createChatMessageSubscription({
                        broadcasterId: this.request.broadcasterId,
                        sessionId,
                        userId: this.validatedToken?.userId,
                    })

                    this.subscriptions = [subscription]
                    this.createdSubscriptionIds.clear()
                    this.createdSubscriptionIds.add(subscription.id)
                }

                this.reconnectAttempt = 0
                this.setup = {
                    broadcasterId: this.request.broadcasterId,
                    sessionId,
                    userId: this.validatedToken?.userId ?? "",
                    subscriptions: this.subscriptions,
                }
                options.resolve(this.setup)
            } catch (error) {
                options.reject(error)
            }

            return
        }

        if (messageType === "session_keepalive") {
            this.resetKeepaliveTimer()
            return
        }

        if (messageType === "session_reconnect") {
            const reconnectUrl = payload.payload?.session?.reconnect_url

            if (!reconnectUrl) {
                options.reject(
                    new PlatformApiError(
                        "Twitch EventSub reconnect payload did not include reconnect_url.",
                        { platform: TWITCH_PLATFORM },
                    ),
                )
                return
            }

            this.resetKeepaliveTimer()
            void this.performServerRequestedReconnect(reconnectUrl, options.socket)
            return
        }

        if (messageType === "revocation") {
            this.resetKeepaliveTimer()
            this.emitError(
                new PlatformApiError("Twitch revoked the EventSub subscription.", {
                    platform: TWITCH_PLATFORM,
                }),
            )
            return
        }

        if (messageType !== "notification") {
            this.resetKeepaliveTimer()
            return
        }

        this.resetKeepaliveTimer()

        if (metadata.subscription_type !== TWITCH_CHAT_MESSAGE_EVENT) {
            return
        }

        const transportMessageId = metadata.message_id

        if (!transportMessageId) {
            this.emitError(
                new PlatformApiError(
                    "Twitch notification metadata did not include message_id.",
                    { platform: TWITCH_PLATFORM },
                ),
            )
            return
        }

        if (!this.seenTransportMessageIds.remember(transportMessageId)) {
            return
        }

        try {
            const normalizedMessage = normalizeTwitchChatMessage(payload, {
                includeRaw: this.includeRaw,
            })
            this.emitMessage(normalizedMessage)
        } catch (error) {
            this.emitError(error)
        }
    }

    /**
     * Follow Twitch's reconnect flow without recreating the subscription.
     */
    private async performServerRequestedReconnect(
        reconnectUrl: string,
        previousSocket: WebSocket,
    ): Promise<void> {
        if (!this.shouldRun || this.reconnectInProgress) {
            return
        }

        this.reconnectInProgress = true

        try {
            await this.connect({
                url: reconnectUrl,
                shouldCreateSubscription: false,
            })

            if (previousSocket.readyState === WebSocket.OPEN) {
                previousSocket.close(1000, "Reconnected")
            }
        } catch (error) {
            this.emitError(error)
            this.scheduleReconnect()
        } finally {
            this.reconnectInProgress = false
        }
    }

    /**
     * Reconnect after an unexpected disconnect and recreate the subscription.
     */
    private scheduleReconnect(): void {
        if (!this.shouldRun || this.reconnectTimer) {
            return
        }

        const delay = Math.min(
            1000 * Math.max(1, 2 ** this.reconnectAttempt),
            MAX_RECONNECT_DELAY_MS,
        )
        this.reconnectAttempt += 1

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined
            void this.reconnectAfterDisconnect()
        }, delay)
    }

    private async reconnectAfterDisconnect(): Promise<void> {
        if (!this.shouldRun) {
            return
        }

        try {
            await this.connect({
                url: this.websocketUrl,
                shouldCreateSubscription: true,
            })
            this.reconnectAttempt = 0
        } catch (error) {
            this.emitError(error)
            this.scheduleReconnect()
        }
    }

    /**
     * Track Twitch's keepalive window and reconnect if the socket goes silent.
     */
    private resetKeepaliveTimer(keepaliveTimeoutSeconds?: number): void {
        this.clearKeepaliveTimer()

        const timeoutSeconds =
            keepaliveTimeoutSeconds ?? this.request.keepaliveTimeoutSeconds

        if (!timeoutSeconds || !this.shouldRun) {
            return
        }

        this.keepaliveTimer = setTimeout(() => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                return
            }

            this.socket.close(4005, "Keepalive timeout")
        }, timeoutSeconds * 1000)
    }

    private clearKeepaliveTimer(): void {
        if (this.keepaliveTimer) {
            clearTimeout(this.keepaliveTimer)
            this.keepaliveTimer = undefined
        }
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = undefined
        }
    }

    /**
     * Create a `channel.chat.message` EventSub subscription for the active
     * WebSocket session.
     */
    private async createChatMessageSubscription(options: {
        broadcasterId: string
        sessionId: string
        userId: string | undefined
    }): Promise<TwitchEventSubscription> {
        if (!options.userId) {
            throw new PlatformApiError(
                "Validated Twitch token did not include user_id.",
                { platform: TWITCH_PLATFORM },
            )
        }

        const payload = await twitchRequest<TwitchCreateSubscriptionResponse>(
            this.options,
            "/eventsub/subscriptions",
            {
                method: "POST",
                body: JSON.stringify({
                    type: TWITCH_CHAT_MESSAGE_EVENT,
                    version: TWITCH_CHAT_MESSAGE_EVENT_VERSION,
                    condition: {
                        broadcaster_user_id: options.broadcasterId,
                        user_id: options.userId,
                    },
                    transport: {
                        method: "websocket",
                        session_id: options.sessionId,
                    },
                }),
            },
        )
        const subscription = payload.data?.[0]

        if (!subscription?.id) {
            throw new PlatformApiError(
                "Twitch did not return a subscription id for channel.chat.message.",
                { platform: TWITCH_PLATFORM },
            )
        }

        return normalizeTwitchSubscription(subscription)
    }

    /**
     * Delete subscriptions that were created by this listener instance.
     */
    private async deleteSubscriptions(subscriptionIds: string[]): Promise<void> {
        for (const subscriptionId of subscriptionIds) {
            const url = new URL(`${TWITCH_API_BASE_URL}/eventsub/subscriptions`)
            url.searchParams.set("id", subscriptionId)

            await twitchRequest(this.options, url, {
                method: "DELETE",
            })
        }
    }
}

/**
 * Validate the Twitch user token and ensure it can subscribe to chat events.
 */
async function validateTwitchUserAccessToken(
    options: {
        clientId: string
        userAccessTokenProvider: TwitchUserAccessTokenProvider
    },
    requirements: {
        feature: string
        requiredScopes: readonly string[]
    },
): Promise<TwitchValidatedUserToken> {
    const response = await validateTwitchTokenRequest(
        options.userAccessTokenProvider,
        async (userAccessToken) => {
            try {
                return await fetch(`${TWITCH_AUTH_BASE_URL}/validate`, {
                    headers: {
                        Authorization: `OAuth ${userAccessToken}`,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Twitch token validation failed.", {
                    platform: TWITCH_PLATFORM,
                    cause: error,
                })
            }
        },
    )

    const text = await response.text()
    const payload = text ? (JSON.parse(text) as TwitchTokenValidationResponse) : {}

    if (!response.ok) {
        throw new PlatformApiError("Twitch token validation failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
        })
    }

    if (payload.client_id !== options.clientId) {
        throw new PlatformValidationError(
            "Twitch userAccessToken was not issued for the configured clientId.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (!payload.user_id) {
        throw new PlatformValidationError(
            "Twitch userAccessToken must be a user access token.",
            { platform: TWITCH_PLATFORM },
        )
    }

    const scopes = Array.isArray(payload.scopes) ? payload.scopes : []

    for (const scope of requirements.requiredScopes) {
        if (scopes.includes(scope)) {
            continue
        }

        throw new PlatformValidationError(
            `Twitch userAccessToken must include the "${scope}" scope for ${requirements.feature}.`,
            { platform: TWITCH_PLATFORM },
        )
    }

    return {
        userId: payload.user_id,
        login: payload.login ?? null,
    }
}

/**
 * Send a request to the Twitch API and normalize transport failures.
 */
async function twitchRequest<TPayload>(
    options: {
        clientId: string
        userAccessTokenProvider: TwitchUserAccessTokenProvider
    },
    pathOrUrl: string | URL,
    init: RequestInit = {},
): Promise<TPayload> {
    const url =
        typeof pathOrUrl === "string"
            ? `${TWITCH_API_BASE_URL}${pathOrUrl}`
            : pathOrUrl
    const response = await runTwitchAuthorizedRequest(
        options.userAccessTokenProvider,
        async (userAccessToken) => {
            try {
                return await fetch(url, {
                    ...init,
                    headers: {
                        Authorization: `Bearer ${userAccessToken}`,
                        "Client-Id": options.clientId,
                        "Content-Type": "application/json",
                        ...init.headers,
                    },
                })
            } catch (error) {
                throw new PlatformApiError("Twitch API request failed.", {
                    platform: TWITCH_PLATFORM,
                    cause: error,
                })
            }
        },
    )

    if (!response.ok) {
        throw new PlatformApiError("Twitch API request failed.", {
            platform: TWITCH_PLATFORM,
            status: response.status,
        })
    }

    if (response.status === 204) {
        return undefined as TPayload
    }

    const text = await response.text()

    if (!text) {
        return {} as TPayload
    }

    try {
        return JSON.parse(text) as TPayload
    } catch (error) {
        throw new PlatformApiError("Twitch API response was not valid JSON.", {
            platform: TWITCH_PLATFORM,
            cause: error,
            status: response.status,
        })
    }
}

function requireTwitchUserAccessTokenProvider(
    provider: TwitchUserAccessTokenProvider | undefined,
    feature: string,
): TwitchUserAccessTokenProvider {
    if (provider) {
        return provider
    }

    throw new PlatformValidationError(
        `Twitch userAccessToken is required for ${feature}.`,
        {
            platform: TWITCH_PLATFORM,
        },
    )
}

async function validateTwitchTokenRequest(
    provider: TwitchUserAccessTokenProvider,
    runRequest: (accessToken: string) => Promise<Response>,
): Promise<Response> {
    const accessToken = await provider.getAccessToken()
    let response = await runRequest(accessToken)

    if (response.status === 401 && provider.canRefresh) {
        response = await runRequest(await provider.refreshAccessToken())
    }

    return response
}

async function twitchModerationBanRequest(
    options: {
        clientId: string
        userAccessTokenProvider: TwitchUserAccessTokenProvider
    },
    request: {
        broadcasterId: string
        moderatorId: string
        userId: string
        durationSeconds?: number
        reason?: string
    },
): Promise<TwitchModerationBanResponse> {
    const url = new URL(`${TWITCH_API_BASE_URL}/moderation/bans`)
    url.searchParams.set("broadcaster_id", request.broadcasterId)
    url.searchParams.set("moderator_id", request.moderatorId)

    return twitchRequest<TwitchModerationBanResponse>(options, url, {
        method: "POST",
        body: JSON.stringify({
            data: {
                user_id: request.userId,
                ...(request.durationSeconds !== undefined
                    ? { duration: request.durationSeconds }
                    : {}),
                ...(request.reason ? { reason: request.reason } : {}),
            },
        }),
    })
}

async function runTwitchAuthorizedRequest(
    provider: TwitchUserAccessTokenProvider,
    runRequest: (accessToken: string) => Promise<Response>,
): Promise<Response> {
    const accessToken = await provider.getAccessToken()
    let response = await runRequest(accessToken)

    if (response.status === 401 && provider.canRefresh) {
        response = await runRequest(await provider.refreshAccessToken())
    }

    return response
}

/**
 * Normalize a Twitch EventSub subscription record into the public type.
 */
function normalizeTwitchSubscription(
    subscription: TwitchEventSubscriptionPayload,
): TwitchEventSubscription {
    return {
        id: subscription.id ?? "",
        status: subscription.status ?? "unknown",
        type: subscription.type ?? "",
        version: subscription.version ?? "",
        cost: typeof subscription.cost === "number" ? subscription.cost : null,
        condition: {
            broadcasterUserId:
                subscription.condition?.broadcaster_user_id ?? null,
            userId: subscription.condition?.user_id ?? null,
        },
        transport: {
            method: subscription.transport?.method ?? "",
            sessionId: subscription.transport?.session_id ?? null,
        },
        createdAt: normalizeDate(subscription.created_at ?? undefined),
    }
}

/**
 * Normalize a Twitch chat message notification into the shared message shape.
 */
function normalizeTwitchChatMessage(
    payload: TwitchEventSubEnvelope,
    options: {
        includeRaw: boolean
    },
): ChatMessage<"twitch"> {
    const event = payload.payload?.event
    const metadata = payload.metadata

    if (!event?.message_id) {
        throw new PlatformApiError(
            "Twitch chat notification did not include event.message_id.",
            { platform: TWITCH_PLATFORM },
        )
    }

    const text = normalizeTwitchMessageText(event.message)

    return {
        platform: TWITCH_PLATFORM,
        type: "message",
        id: event.message_id,
        text,
        sentAt: normalizeDate(metadata?.message_timestamp ?? undefined),
        author: {
            id: event.chatter_user_id ?? null,
            username: event.chatter_user_login ?? null,
            displayName: event.chatter_user_name ?? null,
        },
        channel: {
            id: event.broadcaster_user_id ?? null,
            slug: event.broadcaster_user_login ?? null,
            displayName: event.broadcaster_user_name ?? null,
        },
        ...(options.includeRaw ? { raw: payload } : {}),
    }
}

function normalizeTwitchMessageText(
    message: TwitchChatMessageEventPayload["message"],
): string {
    if (message?.text && message.text.length > 0) {
        return message.text
    }

    const text = (message?.fragments ?? [])
        .map((fragment) => fragment.text ?? "")
        .join("")

    if (text.length > 0) {
        return text
    }

    throw new PlatformApiError(
        "Twitch chat notification did not include message text.",
        { platform: TWITCH_PLATFORM },
    )
}

/**
 * Validate user-supplied Twitch chat listener configuration.
 */
function validateTwitchChatListenRequest(
    request: TwitchChatListenRequest,
): asserts request is TwitchChatListenRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "Twitch chat listen request is required.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (!request.broadcasterId || typeof request.broadcasterId !== "string") {
        throw new PlatformValidationError(
            "broadcasterId is required and must be a string.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (
        request.websocketUrl !== undefined &&
        !isValidTwitchWebSocketUrl(request.websocketUrl)
    ) {
        throw new PlatformValidationError(
            "websocketUrl must be a valid ws:// or wss:// URL.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (
        request.keepaliveTimeoutSeconds !== undefined &&
        (
            !Number.isInteger(request.keepaliveTimeoutSeconds) ||
            request.keepaliveTimeoutSeconds < 10 ||
            request.keepaliveTimeoutSeconds > 600
        )
    ) {
        throw new PlatformValidationError(
            "keepaliveTimeoutSeconds must be an integer between 10 and 600.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (
        request.maxRecentMessageIds !== undefined &&
        (
            !Number.isInteger(request.maxRecentMessageIds) ||
            request.maxRecentMessageIds <= 0
        )
    ) {
        throw new PlatformValidationError(
            "maxRecentMessageIds must be a positive integer.",
            { platform: TWITCH_PLATFORM },
        )
    }
}

function validateTwitchSendMessageRequest(
    request: TwitchSendMessageRequest,
): asserts request is TwitchSendMessageRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "Twitch send message request is required.",
            { platform: TWITCH_PLATFORM },
        )
    }

    validateRequiredTwitchString(request.broadcasterId, "broadcasterId")

    if (
        !request.text ||
        typeof request.text !== "string" ||
        request.text.trim().length === 0
    ) {
        throw new PlatformValidationError(
            "Message text is required and must be a non-empty string.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (request.replyParentMessageId !== undefined) {
        validateRequiredTwitchString(
            request.replyParentMessageId,
            "replyParentMessageId",
        )
    }
}

function validateTwitchDeleteMessageRequest(
    request: TwitchDeleteMessageRequest,
): asserts request is TwitchDeleteMessageRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "Twitch delete message request is required.",
            { platform: TWITCH_PLATFORM },
        )
    }

    validateRequiredTwitchString(request.broadcasterId, "broadcasterId")
    validateRequiredTwitchString(request.messageId, "messageId")
}

function validateTwitchBanUserRequest(
    request: TwitchBanUserRequest,
): asserts request is TwitchBanUserRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Twitch ban user request is required.", {
            platform: TWITCH_PLATFORM,
        })
    }

    validateRequiredTwitchString(request.broadcasterId, "broadcasterId")
    validateRequiredTwitchString(request.userId, "userId")
    validateOptionalTwitchReason(request.reason)
}

function validateTwitchTimeoutUserRequest(
    request: TwitchTimeoutUserRequest,
): asserts request is TwitchTimeoutUserRequest {
    validateTwitchBanUserRequest(request)

    if (
        !Number.isInteger(request.durationSeconds) ||
        request.durationSeconds <= 0
    ) {
        throw new PlatformValidationError(
            "durationSeconds is required and must be a positive integer.",
            { platform: TWITCH_PLATFORM },
        )
    }
}

function validateTwitchUnbanUserRequest(
    request: TwitchUnbanUserRequest,
): asserts request is TwitchUnbanUserRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "Twitch unban user request is required.",
            { platform: TWITCH_PLATFORM },
        )
    }

    validateRequiredTwitchString(request.broadcasterId, "broadcasterId")
    validateRequiredTwitchString(request.userId, "userId")
}

function validateRequiredTwitchString(value: string, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new PlatformValidationError(
            `${field} is required and must be a string.`,
            { platform: TWITCH_PLATFORM },
        )
    }
}

function validateOptionalTwitchReason(reason: string | undefined): void {
    if (
        reason !== undefined &&
        (typeof reason !== "string" || reason.trim().length === 0)
    ) {
        throw new PlatformValidationError(
            "reason must be a non-empty string when provided.",
            { platform: TWITCH_PLATFORM },
        )
    }
}

function buildWebSocketUrl(
    websocketUrl: string,
    keepaliveTimeoutSeconds?: number,
): string {
    const url = new URL(websocketUrl)

    if (keepaliveTimeoutSeconds !== undefined) {
        url.searchParams.set(
            "keepalive_timeout_seconds",
            String(keepaliveTimeoutSeconds),
        )
    }

    return url.toString()
}

function isValidTwitchWebSocketUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === "ws:" || url.protocol === "wss:"
    } catch {
        return false
    }
}

function normalizeDate(value: string | undefined): string {
    const timestamp = value ? Date.parse(value) : Number.NaN

    return Number.isNaN(timestamp)
        ? new Date().toISOString()
        : new Date(timestamp).toISOString()
}

function normalizeNullableDate(value: string | undefined): string | null {
    if (!value) {
        return null
    }

    const timestamp = Date.parse(value)

    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}
