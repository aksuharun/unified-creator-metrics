import { ChatListenerEmitter } from "../../chat-listener.js"
import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { RecentIdTracker } from "../../recent-message-ids.js"
import type { ChatMessage } from "../../types.js"
import {
    createKickUserAccessTokenProvider,
    type KickUserAccessTokenProvider,
} from "./auth.js"
import { KICK_PLATFORM } from "./constants.js"
import {
    requireKickAppAccessToken,
} from "./validation.js"
import type {
    KickBanUserRequest,
    KickBanUserResult,
    KickChatClient,
    KickChatListenRequest,
    KickChatListener,
    KickChatStartResult,
    KickDeleteMessageRequest,
    KickDeleteMessageResult,
    KickEventSubscription,
    KickNodeWebhookRequest,
    KickSendMessageRequest,
    KickSendMessageResult,
    KickStopOptions,
    KickSubscriptionMode,
    KickTimeoutUserRequest,
    KickTimeoutUserResult,
    KickUnbanUserRequest,
    KickUnbanUserResult,
    KickWebhookRequest,
    KickWebhookResult,
} from "./types.js"

const KICK_API_BASE_URL = "https://api.kick.com"
const KICK_CHAT_MESSAGE_EVENT = "chat.message.sent"
const KICK_CHAT_MESSAGE_EVENT_VERSION = 1
const DEFAULT_MAX_RECENT_MESSAGE_IDS = 1000
const KICK_TIMEOUT_MINUTES_MIN = 1
const KICK_TIMEOUT_MINUTES_MAX = 10080
const SECONDS_PER_MINUTE = 60

type KickChatClientOptions = {
    appAccessToken?: string
    userAccessToken?: string
    userAccessTokenProvider?: KickUserAccessTokenProvider
}

type KickChatMessagePayload = {
    message_id?: string
    content?: string
    created_at?: string
    broadcaster?: KickWebhookUser
    sender?: KickWebhookUser
}

type KickWebhookUser = {
    user_id?: number | string | null
    username?: string | null
    channel_slug?: string | null
}

type KickEventSubscriptionsResponse = {
    data?: KickEventSubscriptionPayload[]
    message?: string
}

type KickEventSubscriptionPayload = {
    id?: string | null
    subscription_id?: string | null
    event?: string | null
    name?: string | null
    version?: number | null
    method?: string | null
    broadcaster_user_id?: number | string | null
    callback_url?: string | null
    created_at?: string | null
    updated_at?: string | null
    app_id?: string | null
    transport?: {
        method?: string | null
        callback_url?: string | null
        webhook_url?: string | null
    } | null
}

type KickPostEventSubscription = {
    name?: string
    version?: number
    subscription_id?: string
    callback_url?: string | null
    error?: string
}

type KickPostEventSubscriptionsResponse = {
    data?: KickPostEventSubscription[]
    message?: string
}

type KickPublicKeyResponse = {
    data?: {
        public_key?: string
    }
    message?: string
}

type KickSendMessageResponse = {
    data?: {
        id?: string | number | null
        message_id?: string | number | null
        created_at?: string | null
    }
    message?: string
}

type KickModerationBanResponse = {
    data?: {
        id?: string | number | null
        expires_at?: string | null
    } | null
    message?: string
}

/**
 * Create the Kick chat capability object exposed as `kick.chat`.
 */
export function createKickChatClient(
    options: KickChatClientOptions,
): KickChatClient {
    const userAccessTokenProvider =
        options.userAccessTokenProvider ??
        createKickUserAccessTokenProvider({
            accessToken: options.userAccessToken,
        })

    return {
        listen(request: KickChatListenRequest = {}) {
            const appAccessToken = requireKickAppAccessToken(
                options.appAccessToken,
                "chat.listen()",
            )

            return new KickChatListenerImpl({ appAccessToken }, request)
        },
        async sendMessage(
            request: KickSendMessageRequest,
        ): Promise<KickSendMessageResult> {
            validateKickSendMessageRequest(request)
            const resolvedUserAccessTokenProvider =
                requireKickUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.sendMessage()",
                )
            const userAccessToken =
                await resolvedUserAccessTokenProvider.getAccessToken()

            const messageType = request.type ?? "user"
            const broadcasterUserId =
                messageType === "user" && "broadcasterUserId" in request
                    ? request.broadcasterUserId
                    : undefined
            const payload = await kickRequest<KickSendMessageResponse>("/public/v1/chat", {
                accessToken: userAccessToken,
                accessTokenProvider: resolvedUserAccessTokenProvider,
                method: "POST",
                body: JSON.stringify({
                    content: request.text,
                    type: messageType,
                    ...(messageType === "user"
                        ? { broadcaster_user_id: broadcasterUserId }
                        : {}),
                }),
            })

            return {
                platform: KICK_PLATFORM,
                messageId: stringifyNullable(
                    payload.data?.id ?? payload.data?.message_id,
                ),
                sentAt: normalizeDate(payload.data?.created_at ?? undefined),
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async deleteMessage(
            request: KickDeleteMessageRequest,
        ): Promise<KickDeleteMessageResult> {
            validateKickDeleteMessageRequest(request)
            const resolvedUserAccessTokenProvider =
                requireKickUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.deleteMessage()",
                )
            const userAccessToken =
                await resolvedUserAccessTokenProvider.getAccessToken()
            const payload = await kickRequest<unknown>(
                `/public/v1/chat/${encodeURIComponent(request.messageId)}`,
                {
                    accessToken: userAccessToken,
                    accessTokenProvider: resolvedUserAccessTokenProvider,
                    method: "DELETE",
                },
            )

            return {
                platform: KICK_PLATFORM,
                messageId: request.messageId,
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async banUser(request: KickBanUserRequest): Promise<KickBanUserResult> {
            validateKickBanUserRequest(request)
            const resolvedUserAccessTokenProvider =
                requireKickUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.banUser()",
                )
            const userAccessToken =
                await resolvedUserAccessTokenProvider.getAccessToken()
            const payload = await kickRequest<KickModerationBanResponse>(
                "/public/v1/moderation/bans",
                {
                    accessToken: userAccessToken,
                    accessTokenProvider: resolvedUserAccessTokenProvider,
                    method: "POST",
                    body: JSON.stringify({
                        broadcaster_user_id: request.broadcasterUserId,
                        user_id: request.userId,
                        ...(request.reason ? { reason: request.reason } : {}),
                    }),
                },
            )

            return {
                platform: KICK_PLATFORM,
                userId: String(request.userId),
                banId: stringifyNullable(payload.data?.id),
                expiresAt: normalizeNullableDate(payload.data?.expires_at),
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async timeoutUser(
            request: KickTimeoutUserRequest,
        ): Promise<KickTimeoutUserResult> {
            validateKickTimeoutUserRequest(request)
            const resolvedUserAccessTokenProvider =
                requireKickUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.timeoutUser()",
                )
            const userAccessToken =
                await resolvedUserAccessTokenProvider.getAccessToken()
            const durationMinutes = request.durationSeconds / SECONDS_PER_MINUTE
            const payload = await kickRequest<KickModerationBanResponse>(
                "/public/v1/moderation/bans",
                {
                    accessToken: userAccessToken,
                    accessTokenProvider: resolvedUserAccessTokenProvider,
                    method: "POST",
                    body: JSON.stringify({
                        broadcaster_user_id: request.broadcasterUserId,
                        user_id: request.userId,
                        duration: durationMinutes,
                        ...(request.reason ? { reason: request.reason } : {}),
                    }),
                },
            )

            return {
                platform: KICK_PLATFORM,
                userId: String(request.userId),
                banId: stringifyNullable(payload.data?.id),
                durationSeconds: request.durationSeconds,
                expiresAt:
                    normalizeNullableDate(payload.data?.expires_at) ??
                    new Date(Date.now() + request.durationSeconds * 1000).toISOString(),
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
        async unbanUser(
            request: KickUnbanUserRequest,
        ): Promise<KickUnbanUserResult> {
            validateKickUnbanUserRequest(request)
            const resolvedUserAccessTokenProvider =
                requireKickUserAccessTokenProvider(
                    userAccessTokenProvider,
                    "chat.unbanUser()",
                )
            const userAccessToken =
                await resolvedUserAccessTokenProvider.getAccessToken()
            const payload = await kickRequest<unknown>("/public/v1/moderation/bans", {
                accessToken: userAccessToken,
                accessTokenProvider: resolvedUserAccessTokenProvider,
                method: "DELETE",
                body: JSON.stringify({
                    broadcaster_user_id: request.broadcasterUserId,
                    user_id: request.userId,
                }),
            })

            return {
                platform: KICK_PLATFORM,
                userId: String(request.userId),
                banId: null,
                ...(request.includeRaw ? { raw: payload } : {}),
            }
        },
    }
}

/**
 * Validate the request used to send a Kick chat message.
 */
function validateKickSendMessageRequest(
    request: KickSendMessageRequest,
): asserts request is KickSendMessageRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Kick send message request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (
        !request.text ||
        typeof request.text !== "string" ||
        request.text.trim().length === 0
    ) {
        throw new PlatformValidationError(
            "Message text is required and must be a non-empty string.",
            { platform: KICK_PLATFORM },
        )
    }

    if (
        request.type !== undefined &&
        request.type !== "user" &&
        request.type !== "bot"
    ) {
        throw new PlatformValidationError(
            `Kick chat message type "${request.type}" is not supported.`,
            { platform: KICK_PLATFORM },
        )
    }

    const messageType = request.type ?? "user"

    if (
        messageType === "user" &&
        (
            !("broadcasterUserId" in request) ||
            !Number.isInteger(request.broadcasterUserId) ||
            request.broadcasterUserId <= 0
        )
    ) {
        throw new PlatformValidationError(
            "broadcasterUserId must be a positive integer when sending as a user.",
            { platform: KICK_PLATFORM },
        )
    }
}

function validateKickDeleteMessageRequest(
    request: KickDeleteMessageRequest,
): asserts request is KickDeleteMessageRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "Kick delete message request is required.",
            { platform: KICK_PLATFORM },
        )
    }

    if (!request.messageId || typeof request.messageId !== "string") {
        throw new PlatformValidationError(
            "messageId is required and must be a string.",
            { platform: KICK_PLATFORM },
        )
    }
}

function validateKickBanUserRequest(
    request: KickBanUserRequest,
): asserts request is KickBanUserRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Kick ban user request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    validateKickPositiveInteger(request.broadcasterUserId, "broadcasterUserId")
    validateKickPositiveInteger(request.userId, "userId")

    if (
        request.reason !== undefined &&
        (typeof request.reason !== "string" || request.reason.trim().length === 0)
    ) {
        throw new PlatformValidationError(
            "reason must be a non-empty string when provided.",
            { platform: KICK_PLATFORM },
        )
    }
}

function validateKickTimeoutUserRequest(
    request: KickTimeoutUserRequest,
): asserts request is KickTimeoutUserRequest {
    validateKickBanUserRequest(request)

    if (
        !Number.isInteger(request.durationSeconds) ||
        request.durationSeconds <= 0
    ) {
        throw new PlatformValidationError(
            "durationSeconds is required and must be a positive integer.",
            { platform: KICK_PLATFORM },
        )
    }

    if (request.durationSeconds % SECONDS_PER_MINUTE !== 0) {
        throw new PlatformValidationError(
            "Kick timeout durationSeconds must be a whole number of minutes.",
            { platform: KICK_PLATFORM },
        )
    }

    const durationMinutes = request.durationSeconds / SECONDS_PER_MINUTE

    if (
        durationMinutes < KICK_TIMEOUT_MINUTES_MIN ||
        durationMinutes > KICK_TIMEOUT_MINUTES_MAX
    ) {
        throw new PlatformValidationError(
            `Kick timeout durationSeconds must be between ${
                KICK_TIMEOUT_MINUTES_MIN * SECONDS_PER_MINUTE
            } and ${KICK_TIMEOUT_MINUTES_MAX * SECONDS_PER_MINUTE}.`,
            { platform: KICK_PLATFORM },
        )
    }
}

function validateKickUnbanUserRequest(
    request: KickUnbanUserRequest,
): asserts request is KickUnbanUserRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Kick unban user request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    validateKickPositiveInteger(request.broadcasterUserId, "broadcasterUserId")
    validateKickPositiveInteger(request.userId, "userId")
}

function validateKickPositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new PlatformValidationError(
            `${field} must be a positive integer.`,
            { platform: KICK_PLATFORM },
        )
    }
}

/**
 * Kick chat listener implementation backed by webhook delivery.
 */
class KickChatListenerImpl
    extends ChatListenerEmitter<ChatMessage<"kick">, KickChatStartResult>
    implements KickChatListener {
    private readonly seenMessageIds: RecentIdTracker
    private readonly subscriptionIdsCreatedByListener = new Set<string>()
    private readonly includeRaw: boolean
    private readonly subscriptionMode: KickSubscriptionMode
    private readonly shouldVerifySignature: boolean
    private readonly callbackUrl?: string
    private readonly publicKey?: string
    private subscriptions: KickEventSubscription[] = []
    private isStarted = false
    private cachedPublicKey?: string

    constructor(
        private readonly options: { appAccessToken: string },
        private readonly request: KickChatListenRequest,
    ) {
        super()
        validateKickChatListenRequest(request)
        this.seenMessageIds = new RecentIdTracker(
            request.maxRecentMessageIds ?? DEFAULT_MAX_RECENT_MESSAGE_IDS,
        )
        this.includeRaw = request.includeRaw === true
        this.subscriptionMode = resolveKickSubscriptionMode(request)
        this.shouldVerifySignature = request.webhook?.verifySignature !== false
        this.callbackUrl = normalizeComparableUrl(request.webhook?.callbackUrl)
        this.publicKey = request.webhook?.publicKey
    }

    /**
     * Ensure the remote Kick chat subscription exists when configured to do so.
     */
    async start(): Promise<KickChatStartResult> {
        if (this.isStarted) {
            return { subscriptions: this.subscriptions }
        }

        if (this.subscriptionMode === "manual") {
            this.isStarted = true
            return { subscriptions: [] }
        }

        if (this.subscriptionMode === "ensure") {
            const existingSubscriptions = await this.listSubscriptions()
            const existingChatSubscription = existingSubscriptions.find((item) => {
                return (
                    item.event === KICK_CHAT_MESSAGE_EVENT &&
                    item.version === KICK_CHAT_MESSAGE_EVENT_VERSION &&
                    item.method === "webhook" &&
                    matchesBroadcasterUserId(
                        item.broadcaster_user_id,
                        this.request.broadcasterUserId,
                    ) &&
                    matchesCallbackUrl(item.callback_url, this.callbackUrl)
                )
            })

            if (existingChatSubscription) {
                this.subscriptions = [existingChatSubscription]
                this.isStarted = true
                return { subscriptions: this.subscriptions }
            }

            const ambiguousChatSubscription = existingSubscriptions.find((item) => {
                return (
                    item.event === KICK_CHAT_MESSAGE_EVENT &&
                    item.version === KICK_CHAT_MESSAGE_EVENT_VERSION &&
                    item.method === "webhook" &&
                    matchesBroadcasterUserId(
                        item.broadcaster_user_id,
                        this.request.broadcasterUserId,
                    )
                )
            })

            if (
                ambiguousChatSubscription &&
                ambiguousChatSubscription.callback_url === undefined
            ) {
                throw new PlatformApiError(
                    "Kick returned an existing chat subscription without a callback URL. Reuse is ambiguous; use subscription \"create\" or recreate the remote subscription with a callback URL.",
                    { platform: KICK_PLATFORM },
                )
            }
        }

        this.subscriptions = await this.createChatSubscription()

        for (const subscription of this.subscriptions) {
            this.subscriptionIdsCreatedByListener.add(subscription.id)
        }

        this.isStarted = true

        return { subscriptions: this.subscriptions }
    }

    /**
     * Stop local listener state and optionally delete subscriptions created by
     * this listener instance.
     */
    async stop(options: KickStopOptions = {}): Promise<void> {
        if (
            options.unsubscribe === true &&
            this.subscriptionIdsCreatedByListener.size > 0
        ) {
            await this.deleteSubscriptions([
                ...this.subscriptionIdsCreatedByListener,
            ])
            this.subscriptionIdsCreatedByListener.clear()
        }

        this.isStarted = false
        await super.stop()
    }

    /**
     * Read and process a Kick webhook from a Node-style request body stream.
     */
    async handleNodeWebhook(
        request: KickNodeWebhookRequest,
    ): Promise<KickWebhookResult> {
        return this.handleWebhook({
            headers: request.headers,
            rawBody: await readRawBody(request),
        })
    }

    /**
     * Verify, deduplicate, normalize, and emit a raw Kick webhook payload.
     */
    async handleWebhook(request: KickWebhookRequest): Promise<KickWebhookResult> {
        validateKickWebhookRequest(request)

        const eventType = getHeader(request.headers, "kick-event-type")
        const eventVersion = getHeader(request.headers, "kick-event-version")
        const messageId = getHeader(request.headers, "kick-event-message-id")

        if (!eventType) {
            throw new PlatformValidationError("Kick webhook event type is required.", {
                platform: KICK_PLATFORM,
            })
        }

        if (!eventVersion) {
            throw new PlatformValidationError(
                "Kick webhook event version is required.",
                { platform: KICK_PLATFORM },
            )
        }

        if (!messageId) {
            throw new PlatformValidationError(
                "Kick webhook message id is required.",
                { platform: KICK_PLATFORM },
            )
        }

        if (this.shouldVerifySignature) {
            const isValidSignature = await this.verifySignature(
                request.headers,
                request.rawBody,
            )

            if (!isValidSignature) {
                throw new PlatformValidationError(
                    "Kick webhook signature is invalid.",
                    { platform: KICK_PLATFORM },
                )
            }
        }

        if (!this.seenMessageIds.remember(messageId)) {
            return {
                accepted: true,
                duplicate: true,
                eventType,
                emitted: [],
            }
        }

        if (
            eventType !== KICK_CHAT_MESSAGE_EVENT ||
            Number(eventVersion) !== KICK_CHAT_MESSAGE_EVENT_VERSION
        ) {
            return {
                accepted: true,
                duplicate: false,
                eventType,
                emitted: [],
            }
        }

        const payload = parseJson(request.rawBody) as KickChatMessagePayload

        if (
            !matchesBroadcasterUserId(
                payload.broadcaster?.user_id,
                this.request.broadcasterUserId,
            )
        ) {
            return {
                accepted: true,
                duplicate: false,
                eventType,
                emitted: [],
            }
        }

        const message = normalizeKickChatMessage(payload, {
            includeRaw: this.includeRaw,
        })

        this.emitMessage(message)

        return {
            accepted: true,
            duplicate: false,
            eventType,
            emitted: ["message"],
        }
    }

    /**
     * Validate the Kick webhook signature using either the configured public
     * key override or the fetched Kick public key.
     */
    private async verifySignature(
        headers: KickWebhookRequest["headers"],
        rawBody: string,
    ): Promise<boolean> {
        const messageId = getHeader(headers, "kick-event-message-id")
        const timestamp = getHeader(headers, "kick-event-message-timestamp")
        const signature = getHeader(headers, "kick-event-signature")

        if (!messageId || !timestamp || !signature) {
            return false
        }

        const publicKey = await this.getPublicKey()
        const signedPayload = `${messageId}.${timestamp}.${rawBody}`

        try {
            return await verifyRsaSha256Signature({
                publicKey,
                payload: signedPayload,
                signature,
            })
        } catch {
            return false
        }
    }

    /**
     * Resolve and cache the Kick public key used for webhook verification.
     */
    private async getPublicKey(): Promise<string> {
        if (this.publicKey) {
            return this.publicKey
        }

        if (this.cachedPublicKey) {
            return this.cachedPublicKey
        }

        const payload = await kickRequest<KickPublicKeyResponse>(
            "/public/v1/public-key",
            {
                accessToken: this.options.appAccessToken,
            },
        )
        const publicKey = payload.data?.public_key

        if (!publicKey) {
            throw new PlatformApiError(
                "Kick public key response did not include a public key.",
                { platform: KICK_PLATFORM },
            )
        }

        this.cachedPublicKey = publicKey

        return publicKey
    }

    /**
     * List existing Kick event subscriptions visible to the current token.
     */
    private async listSubscriptions(): Promise<KickEventSubscription[]> {
        const url = new URL(`${KICK_API_BASE_URL}/public/v1/events/subscriptions`)

        if (this.request.broadcasterUserId !== undefined) {
            url.searchParams.append(
                "broadcaster_user_id",
                String(this.request.broadcasterUserId),
            )
        }

        const payload = await kickRequest<KickEventSubscriptionsResponse>(url, {
            accessToken: this.options.appAccessToken,
        })

        return (payload.data ?? []).map(normalizeKickEventSubscription)
    }

    /**
     * Create a Kick subscription for `chat.message.sent`.
     */
    private async createChatSubscription(): Promise<KickEventSubscription[]> {
        const payload = await kickRequest<KickPostEventSubscriptionsResponse>(
            "/public/v1/events/subscriptions",
            {
                accessToken: this.options.appAccessToken,
                method: "POST",
                body: JSON.stringify({
                    ...(this.request.broadcasterUserId !== undefined
                        ? { broadcaster_user_id: this.request.broadcasterUserId }
                        : {}),
                    ...(this.callbackUrl
                        ? { callback_url: this.callbackUrl }
                        : {}),
                    events: [
                        {
                            name: KICK_CHAT_MESSAGE_EVENT,
                            version: KICK_CHAT_MESSAGE_EVENT_VERSION,
                        },
                    ],
                    method: "webhook",
                }),
            },
        )

        const createdSubscriptions = payload.data ?? []
        const failedSubscription = createdSubscriptions.find((item) => item.error)

        if (failedSubscription?.error) {
            throw new PlatformApiError(
                `Kick event subscription failed: ${failedSubscription.error}`,
                { platform: KICK_PLATFORM },
            )
        }

        return createdSubscriptions
            .filter((item) => item.subscription_id && item.name && item.version)
            .map((item) => ({
                id: item.subscription_id as string,
                event: item.name as string,
                version: item.version as number,
                method: "webhook",
                ...(item.callback_url ? { callback_url: item.callback_url } : {}),
                broadcaster_user_id: this.request.broadcasterUserId,
            }))
    }

    /**
     * Delete the specified remote Kick event subscriptions.
     */
    private async deleteSubscriptions(subscriptionIds: string[]): Promise<void> {
        const url = new URL(`${KICK_API_BASE_URL}/public/v1/events/subscriptions`)

        for (const subscriptionId of subscriptionIds) {
            url.searchParams.append("id", subscriptionId)
        }

        await kickRequest(url, {
            accessToken: this.options.appAccessToken,
            method: "DELETE",
        })
    }
}

/**
 * Send a JSON request to the Kick public API and normalize transport failures.
 */
async function kickRequest<TPayload>(
    pathOrUrl: string | URL,
    options: {
        accessToken: string
        accessTokenProvider?: KickUserAccessTokenProvider
        method?: string
        body?: string
    },
): Promise<TPayload> {
    const url =
        pathOrUrl instanceof URL
            ? pathOrUrl
            : new URL(pathOrUrl, KICK_API_BASE_URL)

    const runRequest = async (accessToken: string): Promise<Response> => {
        try {
            return await fetch(url, {
                method: options.method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...(options.body
                        ? { "Content-Type": "application/json" }
                        : {}),
                },
                body: options.body,
            })
        } catch (error) {
            throw new PlatformApiError("Kick API request failed.", {
                platform: KICK_PLATFORM,
                cause: error,
            })
        }
    }

    let response = await runRequest(options.accessToken)

    if (response.status === 401 && options.accessTokenProvider?.canRefresh) {
        response = await runRequest(
            await options.accessTokenProvider.refreshAccessToken(),
        )
    }

    const text = await response.text()
    const payload = text ? parseJson(text) : null

    if (!response.ok) {
        throw new PlatformApiError("Kick API request failed.", {
            platform: KICK_PLATFORM,
            status: response.status,
            cause: payload,
        })
    }

    return payload as TPayload
}

function requireKickUserAccessTokenProvider(
    provider: KickUserAccessTokenProvider | undefined,
    feature: string,
): KickUserAccessTokenProvider {
    if (provider) {
        return provider
    }

    throw new PlatformValidationError(
        `Kick userAccessToken is required for ${feature}.`,
        {
            platform: KICK_PLATFORM,
        },
    )
}

/**
 * Normalize a Kick `chat.message.sent` webhook payload into the shared chat
 * message shape used by the library.
 */
function normalizeKickChatMessage(
    payload: KickChatMessagePayload,
    options: { includeRaw: boolean },
): ChatMessage<"kick"> {
    const sender = payload.sender
    const broadcaster = payload.broadcaster

    return {
        platform: KICK_PLATFORM,
        type: "message",
        id: String(payload.message_id ?? ""),
        text: payload.content ?? "",
        sentAt: normalizeDate(payload.created_at),
        author: {
            id: stringifyNullable(sender?.user_id),
            username: sender?.username ?? null,
            displayName: sender?.username ?? null,
        },
        channel: {
            id: stringifyNullable(broadcaster?.user_id),
            slug: broadcaster?.channel_slug ?? broadcaster?.username ?? null,
            displayName: broadcaster?.username ?? null,
        },
        ...(options.includeRaw ? { raw: payload } : {}),
    }
}

/**
 * Validate user-supplied Kick chat listener configuration.
 */
function validateKickChatListenRequest(
    request: KickChatListenRequest,
): asserts request is KickChatListenRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Kick chat listen request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (
        request.broadcasterUserId !== undefined &&
        (!Number.isInteger(request.broadcasterUserId) ||
            request.broadcasterUserId <= 0)
    ) {
        throw new PlatformValidationError(
            "broadcasterUserId must be a positive integer.",
            { platform: KICK_PLATFORM },
        )
    }

    if (
        request.subscription &&
        !["ensure", "create", "manual"].includes(request.subscription)
    ) {
        throw new PlatformValidationError(
            `Kick chat subscription mode "${request.subscription}" is not supported.`,
            { platform: KICK_PLATFORM },
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
            { platform: KICK_PLATFORM },
        )
    }

    if (request.webhook?.callbackUrl !== undefined) {
        validateCallbackUrl(request.webhook.callbackUrl)
    }

    if (
        resolveKickSubscriptionMode(request) === "ensure" &&
        !request.webhook?.callbackUrl
    ) {
        throw new PlatformValidationError(
            "webhook.callbackUrl is required when subscription mode is \"ensure\" so the current endpoint can be matched to an existing Kick subscription.",
            { platform: KICK_PLATFORM },
        )
    }
}

/**
 * Validate the minimal raw webhook input required for parsing and signature
 * verification.
 */
function validateKickWebhookRequest(
    request: KickWebhookRequest,
): asserts request is KickWebhookRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Kick webhook request is required.", {
            platform: KICK_PLATFORM,
        })
    }

    if (!request.rawBody || typeof request.rawBody !== "string") {
        throw new PlatformValidationError("Kick webhook rawBody is required.", {
            platform: KICK_PLATFORM,
        })
    }
}

/**
 * Read a request body stream into the exact raw string Kick signs.
 */
async function readRawBody(request: AsyncIterable<Uint8Array | string>) {
    const decoder = new TextDecoder()
    let rawBody = ""

    for await (const chunk of request) {
        rawBody +=
            typeof chunk === "string"
                ? chunk
                : decoder.decode(chunk, { stream: true })
    }

    return rawBody + decoder.decode()
}

/**
 * Read a webhook header from either the Fetch `Headers` type or a Node header
 * object.
 */
function getHeader(
    headers: KickWebhookRequest["headers"],
    name: string,
): string | undefined {
    if (headers instanceof Headers) {
        return headers.get(name) ?? undefined
    }

    const value = headers[name] ?? headers[name.toLowerCase()]

    if (Array.isArray(value)) {
        return value[0]
    }

    return value
}

/**
 * Parse JSON and raise a platform-specific validation error on invalid input.
 */
function parseJson(value: string): unknown {
    try {
        return JSON.parse(value)
    } catch {
        throw new PlatformValidationError("Invalid JSON payload.", {
            platform: KICK_PLATFORM,
        })
    }
}

/**
 * Normalize provider timestamps to ISO strings, falling back to `now` when the
 * provider value is missing or invalid.
 */
function normalizeDate(value: string | undefined): string {
    const timestamp = value ? Date.parse(value) : Number.NaN

    return Number.isNaN(timestamp)
        ? new Date().toISOString()
        : new Date(timestamp).toISOString()
}

function normalizeNullableDate(value: string | null | undefined): string | null {
    if (!value) {
        return null
    }

    const timestamp = Date.parse(value)

    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

/**
 * Convert nullable numeric or string identifiers into the shared string form.
 */
function stringifyNullable(value: number | string | null | undefined): string | null {
    return value === null || value === undefined ? null : String(value)
}

function matchesBroadcasterUserId(
    actual: number | string | null | undefined,
    expected: number | undefined,
): boolean {
    if (expected === undefined) {
        return true
    }

    return String(actual) === String(expected)
}

function matchesCallbackUrl(
    actual: string | undefined,
    expected: string | undefined,
): boolean {
    if (expected === undefined) {
        return true
    }

    if (!actual) {
        return false
    }

    return normalizeComparableUrl(actual) === expected
}

function normalizeKickEventSubscription(
    payload: KickEventSubscriptionPayload,
): KickEventSubscription {
    const broadcasterUserId = parseOptionalInteger(payload.broadcaster_user_id)

    return {
        id: String(payload.id ?? payload.subscription_id ?? ""),
        event: payload.event ?? payload.name ?? "",
        version: Number(payload.version ?? 0),
        method: payload.method ?? payload.transport?.method ?? "webhook",
        ...(payload.callback_url || payload.transport?.callback_url || payload.transport?.webhook_url
            ? {
                callback_url:
                    payload.callback_url ??
                    payload.transport?.callback_url ??
                    payload.transport?.webhook_url ??
                    undefined,
            }
            : {}),
        ...(broadcasterUserId !== null
            ? { broadcaster_user_id: broadcasterUserId }
            : {}),
        ...(payload.created_at ? { created_at: payload.created_at } : {}),
        ...(payload.updated_at ? { updated_at: payload.updated_at } : {}),
        ...(payload.app_id ? { app_id: payload.app_id } : {}),
    }
}

function resolveKickSubscriptionMode(
    request: KickChatListenRequest,
): KickSubscriptionMode {
    return request.subscription ?? "ensure"
}

function validateCallbackUrl(callbackUrl: string): void {
    let url: URL

    try {
        url = new URL(callbackUrl)
    } catch {
        throw new PlatformValidationError(
            "webhook.callbackUrl must be a valid absolute URL.",
            { platform: KICK_PLATFORM },
        )
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new PlatformValidationError(
            "webhook.callbackUrl must use http or https.",
            { platform: KICK_PLATFORM },
        )
    }
}

function normalizeComparableUrl(value: string | undefined): string | undefined {
    if (!value) {
        return undefined
    }

    try {
        return new URL(value).toString()
    } catch {
        return value
    }
}

function parseOptionalInteger(
    value: number | string | null | undefined,
): number | null {
    if (value === null || value === undefined) {
        return null
    }

    const parsed = Number.parseInt(String(value), 10)

    return Number.isNaN(parsed) ? null : parsed
}

/**
 * Verify a base64-encoded RSA SHA-256 signature using Web Crypto.
 */
async function verifyRsaSha256Signature(options: {
    publicKey: string
    payload: string
    signature: string
}): Promise<boolean> {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
        "spki",
        pemToArrayBuffer(options.publicKey),
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["verify"],
    )

    return globalThis.crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        base64ToArrayBuffer(options.signature),
        new TextEncoder().encode(options.payload),
    )
}

/**
 * Convert a PEM public key into the binary SPKI format expected by Web Crypto.
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
    const base64 = pem
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replaceAll(/\s/g, "")

    return base64ToArrayBuffer(base64)
}

/**
 * Decode a base64 string into an ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = globalThis.atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return bytes.buffer
}
