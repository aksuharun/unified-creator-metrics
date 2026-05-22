import { ChatListenerEmitter } from "../../chat-listener.js"
import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { RecentIdTracker } from "../../recent-message-ids.js"
import type { ChatMessage } from "../../types.js"
import { TWITCH_PLATFORM } from "./constants.js"
import type {
    TwitchChatClient,
    TwitchChatListenRequest,
    TwitchChatListener,
    TwitchChatStartResult,
    TwitchEventSubscription,
    TwitchStopOptions,
} from "./types.js"

const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix"
const TWITCH_AUTH_BASE_URL = "https://id.twitch.tv/oauth2"
const TWITCH_EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws"
const TWITCH_CHAT_MESSAGE_EVENT = "channel.chat.message"
const TWITCH_CHAT_MESSAGE_EVENT_VERSION = "1"
const TWITCH_CHAT_SCOPE = "user:read:chat"
const DEFAULT_MAX_RECENT_IDS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

type TwitchChatClientOptions = {
    clientId: string
    accessToken: string
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

/**
 * Create the Twitch chat capability object exposed as `twitch.chat`.
 */
export function createTwitchChatClient(
    options: TwitchChatClientOptions,
): TwitchChatClient {
    return {
        listen(request: TwitchChatListenRequest): TwitchChatListener {
            return new TwitchChatListenerImpl(options, request)
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
        private readonly options: TwitchChatClientOptions,
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
            this.validatedToken = await validateTwitchUserAccessToken(this.options)
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
    options: TwitchChatClientOptions,
): Promise<TwitchValidatedUserToken> {
    let response: Response

    try {
        response = await fetch(`${TWITCH_AUTH_BASE_URL}/validate`, {
            headers: {
                Authorization: `OAuth ${options.accessToken}`,
            },
        })
    } catch (error) {
        throw new PlatformApiError("Twitch token validation failed.", {
            platform: TWITCH_PLATFORM,
            cause: error,
        })
    }

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
            "Twitch accessToken was not issued for the configured clientId.",
            { platform: TWITCH_PLATFORM },
        )
    }

    if (!payload.user_id) {
        throw new PlatformValidationError(
            "Twitch accessToken must be a user access token.",
            { platform: TWITCH_PLATFORM },
        )
    }

    const scopes = Array.isArray(payload.scopes) ? payload.scopes : []

    if (!scopes.includes(TWITCH_CHAT_SCOPE)) {
        throw new PlatformValidationError(
            `Twitch accessToken must include the "${TWITCH_CHAT_SCOPE}" scope.`,
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
    options: TwitchChatClientOptions,
    pathOrUrl: string | URL,
    init: RequestInit = {},
): Promise<TPayload> {
    let response: Response

    try {
        response = await fetch(
            typeof pathOrUrl === "string"
                ? `${TWITCH_API_BASE_URL}${pathOrUrl}`
                : pathOrUrl,
            {
                ...init,
                headers: {
                    Authorization: `Bearer ${options.accessToken}`,
                    "Client-Id": options.clientId,
                    "Content-Type": "application/json",
                    ...init.headers,
                },
            },
        )
    } catch (error) {
        throw new PlatformApiError("Twitch API request failed.", {
            platform: TWITCH_PLATFORM,
            cause: error,
        })
    }

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
