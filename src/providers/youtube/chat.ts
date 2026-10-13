import { ChatListenerEmitter } from "../../chat-listener.js"
import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { RecentIdTracker } from "../../recent-message-ids.js"
import type { ChatMessage } from "../../types.js"
import { YOUTUBE_PLATFORM } from "./constants.js"
import {
    createYoutubeChatStream,
    isRetryableYoutubeChatStreamError,
    normalizeYoutubeChatStreamError,
    type YoutubeChatStream,
    type YoutubeLiveChatMessage,
    type YoutubeLiveChatMessagesPayload,
} from "./chat-stream.js"
import type { GoogleYoutubeClient } from "./google-client.js"
import type {
    YoutubeBanUserRequest,
    YoutubeBanUserResult,
    YoutubeChatClient,
    YoutubeChatListenRequest,
    YoutubeChatListener,
    YoutubeDeleteMessageRequest,
    YoutubeDeleteMessageResult,
    YoutubeTimeoutUserRequest,
    YoutubeTimeoutUserResult,
    YoutubeSendMessageRequest,
    YoutubeSendMessageResult,
    YoutubeChatStartResult,
    YoutubeUnbanUserRequest,
    YoutubeUnbanUserResult,
} from "./types.js"

type YoutubeChatClientOptions = {
    youtubeApiClient: GoogleYoutubeClient
}

const DEFAULT_MAX_RECENT_MESSAGE_IDS = 1000
const STREAM_RECONNECT_INTERVAL_MS = 5000
const MAX_POLLING_INTERVAL_MS = 2147483647
const SUPPORTED_YOUTUBE_CHAT_LISTEN_OPTIONS = new Set([
    "liveChatId",
    "liveVideoId",
    "transport",
    "pollingIntervalMs",
    "maxResults",
    "includeHistory",
    "maxRecentMessageIds",
    "includeRaw",
])

type YoutubeChatSetup = {
    liveChatId: string
    liveVideoId: string | null
    channelId: string | null
    channelDisplayName: string | null
}

type YoutubeLiveChatBan = {
    id?: string | null
    snippet?: {
        banDurationSeconds?: string | null
        bannedUserDetails?: {
            channelId?: string | null
        } | null
    } | null
}

/**
 * Create the YouTube chat capability object exposed as `youtube.chat`.
 */
export function createYoutubeChatClient(
    options: YoutubeChatClientOptions,
): YoutubeChatClient {
    return {
        listen(request: YoutubeChatListenRequest) {
            return new YoutubeChatListenerImpl(options, request)
        },
        async sendMessage(
            request: YoutubeSendMessageRequest,
        ): Promise<YoutubeSendMessageResult> {
            validateYoutubeSendMessageRequest(request)

            try {
                const response = await options.youtubeApiClient.liveChatMessages.insert({
                    part: ["snippet"],
                    requestBody: {
                        snippet: {
                            liveChatId: request.liveChatId,
                            type: "textMessageEvent",
                            textMessageDetails: {
                                messageText: request.text,
                            },
                        },
                    },
                })

                return {
                    platform: YOUTUBE_PLATFORM,
                    messageId: response.data.id ?? null,
                    sentAt: normalizeDate(
                        response.data.snippet?.publishedAt ?? undefined,
                    ),
                    ...(request.includeRaw ? { raw: response.data } : {}),
                }
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
        async deleteMessage(
            request: YoutubeDeleteMessageRequest,
        ): Promise<YoutubeDeleteMessageResult> {
            validateYoutubeDeleteMessageRequest(request)

            try {
                const response =
                    await options.youtubeApiClient.liveChatMessages.delete({
                        id: request.messageId,
                    })

                return {
                    platform: YOUTUBE_PLATFORM,
                    messageId: request.messageId,
                    ...(request.includeRaw ? { raw: response.data } : {}),
                }
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
        async banUser(
            request: YoutubeBanUserRequest,
        ): Promise<YoutubeBanUserResult> {
            validateYoutubeBanUserRequest(request)

            try {
                const response = await options.youtubeApiClient.liveChatBans.insert({
                    part: ["snippet"],
                    requestBody: {
                        snippet: {
                            liveChatId: request.liveChatId,
                            type: "permanent",
                            bannedUserDetails: {
                                channelId: request.userId,
                            },
                        },
                    },
                })
                const payload = response.data as YoutubeLiveChatBan

                return {
                    platform: YOUTUBE_PLATFORM,
                    userId:
                        payload.snippet?.bannedUserDetails?.channelId ??
                        request.userId,
                    banId: payload.id ?? null,
                    expiresAt: null,
                    ...(request.includeRaw ? { raw: response.data } : {}),
                }
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
        async timeoutUser(
            request: YoutubeTimeoutUserRequest,
        ): Promise<YoutubeTimeoutUserResult> {
            validateYoutubeTimeoutUserRequest(request)

            try {
                const response = await options.youtubeApiClient.liveChatBans.insert({
                    part: ["snippet"],
                    requestBody: {
                        snippet: {
                            liveChatId: request.liveChatId,
                            type: "temporary",
                            banDurationSeconds: String(request.durationSeconds),
                            bannedUserDetails: {
                                channelId: request.userId,
                            },
                        },
                    },
                })
                const payload = response.data as YoutubeLiveChatBan

                return {
                    platform: YOUTUBE_PLATFORM,
                    userId:
                        payload.snippet?.bannedUserDetails?.channelId ??
                        request.userId,
                    banId: payload.id ?? null,
                    durationSeconds: normalizePositiveInteger(
                        payload.snippet?.banDurationSeconds,
                    ) ?? request.durationSeconds,
                    expiresAt: new Date(
                        Date.now() + request.durationSeconds * 1000,
                    ).toISOString(),
                    ...(request.includeRaw ? { raw: response.data } : {}),
                }
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
        async unbanUser(
            request: YoutubeUnbanUserRequest,
        ): Promise<YoutubeUnbanUserResult> {
            validateYoutubeUnbanUserRequest(request)

            try {
                const response = await options.youtubeApiClient.liveChatBans.delete({
                    id: request.banId,
                })

                return {
                    platform: YOUTUBE_PLATFORM,
                    userId: null,
                    banId: request.banId,
                    ...(request.includeRaw ? { raw: response.data } : {}),
                }
            } catch (error) {
                throw new PlatformApiError("YouTube API request failed.", {
                    platform: YOUTUBE_PLATFORM,
                    status: getGoogleApiErrorStatus(error),
                    cause: error,
                })
            }
        },
    }
}

/**
 * Validate the request used to send a YouTube live chat message.
 */
function validateYoutubeSendMessageRequest(
    request: YoutubeSendMessageRequest,
): asserts request is YoutubeSendMessageRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "YouTube send message request is required.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (!request.liveChatId || typeof request.liveChatId !== "string") {
        throw new PlatformValidationError(
            "liveChatId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (
        !request.text ||
        typeof request.text !== "string" ||
        request.text.trim().length === 0
    ) {
        throw new PlatformValidationError(
            "Message text is required and must be a non-empty string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

function validateYoutubeDeleteMessageRequest(
    request: YoutubeDeleteMessageRequest,
): asserts request is YoutubeDeleteMessageRequest {
    validateYoutubeMessageIdRequest(
        request,
        "YouTube delete message request is required.",
    )
}

function validateYoutubeBanUserRequest(
    request: YoutubeBanUserRequest,
): asserts request is YoutubeBanUserRequest {
    validateYoutubeModerationTargetRequest(
        request,
        "YouTube ban user request is required.",
    )
}

function validateYoutubeTimeoutUserRequest(
    request: YoutubeTimeoutUserRequest,
): asserts request is YoutubeTimeoutUserRequest {
    validateYoutubeModerationTargetRequest(
        request,
        "YouTube timeout user request is required.",
    )

    if (
        !Number.isInteger(request.durationSeconds) ||
        request.durationSeconds <= 0
    ) {
        throw new PlatformValidationError(
            "durationSeconds is required and must be a positive integer.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

function validateYoutubeUnbanUserRequest(
    request: YoutubeUnbanUserRequest,
): asserts request is YoutubeUnbanUserRequest {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(
            "YouTube unban user request is required.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (!request.banId || typeof request.banId !== "string") {
        throw new PlatformValidationError(
            "banId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

function validateYoutubeMessageIdRequest(
    request: YoutubeDeleteMessageRequest,
    missingRequestMessage: string,
): void {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(missingRequestMessage, {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!request.messageId || typeof request.messageId !== "string") {
        throw new PlatformValidationError(
            "messageId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

function validateYoutubeModerationTargetRequest(
    request: YoutubeBanUserRequest | YoutubeTimeoutUserRequest,
    missingRequestMessage: string,
): void {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError(missingRequestMessage, {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!request.liveChatId || typeof request.liveChatId !== "string") {
        throw new PlatformValidationError(
            "liveChatId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (!request.userId || typeof request.userId !== "string") {
        throw new PlatformValidationError(
            "userId is required and must be a string.",
            { platform: YOUTUBE_PLATFORM },
        )
    }
}

/**
 * YouTube chat listener backed by polling or a server-streaming connection.
 */
class YoutubeChatListenerImpl
    extends ChatListenerEmitter<ChatMessage<"youtube">, YoutubeChatStartResult>
    implements YoutubeChatListener {
    private readonly seenMessageIds: RecentIdTracker
    private readonly pollingIntervalMs: number
    private readonly maxResults: number
    private readonly includeHistory: boolean
    private readonly includeRaw: boolean
    private pageToken: string | undefined
    private setup: YoutubeChatSetup | undefined
    private isStarted = false
    private generation = 0
    private startPromise: Promise<YoutubeChatStartResult> | undefined
    private transportTimeout: ReturnType<typeof setTimeout> | undefined
    private stream: YoutubeChatStream | undefined

    constructor(
        private readonly options: YoutubeChatClientOptions,
        private readonly request: YoutubeChatListenRequest,
    ) {
        super()
        validateYoutubeChatListenRequest(request)
        this.seenMessageIds = new RecentIdTracker(
            request.maxRecentMessageIds ?? DEFAULT_MAX_RECENT_MESSAGE_IDS,
        )
        this.pollingIntervalMs = request.pollingIntervalMs ?? 5000
        this.maxResults = request.maxResults ?? 200
        this.includeHistory = request.includeHistory === true
        this.includeRaw = request.includeRaw === true
    }

    /**
     * Resolve live chat setup and start receiving messages.
     */
    async start(): Promise<YoutubeChatStartResult> {
        if (this.startPromise) {
            return this.startPromise
        }

        if (this.isStarted && this.setup) {
            return {
                liveChatId: this.setup.liveChatId,
                liveVideoId: this.setup.liveVideoId,
            }
        }

        const generation = ++this.generation
        this.isStarted = true
        this.startPromise = this.startListening(generation)

        try {
            return await this.startPromise
        } finally {
            if (generation === this.generation) {
                this.startPromise = undefined
            }
        }
    }

    /**
     * Stop transport work without removing registered event handlers.
     */
    async stop(): Promise<void> {
        this.isStarted = false
        this.generation++
        this.startPromise = undefined

        if (this.transportTimeout) {
            clearTimeout(this.transportTimeout)
            this.transportTimeout = undefined
        }

        this.stream?.close()
        this.stream = undefined
        await super.stop()
    }

    /**
     * Initialize transport work for a single listener run.
     */
    private async startListening(generation: number): Promise<YoutubeChatStartResult> {
        try {
            const setup = await this.resolveSetup()
            this.assertCurrentRun(generation)
            this.setup = setup

            if (this.request.transport === "streamList") {
                await this.openStream(generation, true)
            } else {
                const payload = await this.listMessages()
                this.assertCurrentRun(generation)
                this.processPayload(payload, generation, true)
                this.scheduleNextPoll(generation, payload.pollingIntervalMillis ?? undefined)
            }

            return {
                liveChatId: setup.liveChatId,
                liveVideoId: setup.liveVideoId,
            }
        } catch (error) {
            if (this.isCurrentRun(generation)) {
                this.isStarted = false
            }

            throw error
        }
    }

    /**
     * Poll the YouTube live chat API once and schedule the next iteration.
     */
    private async poll(generation: number): Promise<void> {
        if (!this.isCurrentRun(generation)) {
            return
        }

        try {
            const payload = await this.listMessages()

            if (!this.isCurrentRun(generation)) {
                return
            }

            this.processPayload(payload, generation)
            this.scheduleNextPoll(generation, payload.pollingIntervalMillis ?? undefined)
        } catch (error) {
            if (this.isCurrentRun(generation)) {
                this.emitError(error)
                this.scheduleNextPoll(generation)
            }
        }
    }

    /**
     * Respect the larger of the configured and provider polling intervals.
     */
    private scheduleNextPoll(generation: number, providerPollingIntervalMs?: number): void {
        if (!this.isCurrentRun(generation)) {
            return
        }

        const delay = Math.max(
            this.pollingIntervalMs,
            providerPollingIntervalMs ?? 0,
        )

        this.schedulePollAfter(generation, delay)
    }

    /**
     * Split long provider delays so Node does not clamp them to one millisecond.
     */
    private schedulePollAfter(generation: number, delay: number): void {
        if (!this.isCurrentRun(generation)) {
            return
        }

        const timeoutDelay = Math.min(delay, MAX_POLLING_INTERVAL_MS)
        this.transportTimeout = setTimeout(() => {
            if (delay > timeoutDelay) {
                this.schedulePollAfter(generation, delay - timeoutDelay)
            } else {
                void this.poll(generation)
            }
        }, timeoutDelay)
    }

    /**
     * Open a stream and wait for its first payload before reporting startup.
     */
    private async openStream(generation: number, isInitial = false): Promise<void> {
        if (!this.setup) {
            throw new PlatformValidationError(
                "YouTube chat listener has not been started.",
                { platform: YOUTUBE_PLATFORM },
            )
        }

        const setup = this.setup
        let stream: YoutubeChatStream | undefined

        try {
            stream = await createYoutubeChatStream(this.options.youtubeApiClient, {
                liveChatId: setup.liveChatId,
            })
            this.assertCurrentRun(generation)
            this.stream = stream

            const iterator = stream.messages[Symbol.asyncIterator]()
            const first = await iterator.next()
            this.assertCurrentRun(generation)

            if (first.done) {
                throw new PlatformApiError(
                    "YouTube live chat stream ended before returning messages.",
                    { platform: YOUTUBE_PLATFORM, status: 503 },
                )
            }

            this.processPayload(first.value, generation, isInitial)

            if (this.isCurrentRun(generation)) {
                void this.consumeStream(iterator, stream, generation)
            } else {
                stream.close()
                if (this.stream === stream) {
                    this.stream = undefined
                }
            }
        } catch (error) {
            stream?.close()
            if (this.stream === stream) {
                this.stream = undefined
            }

            throw error instanceof PlatformValidationError
                ? error
                : normalizeYoutubeChatStreamError(error)
        }
    }

    /**
     * Consume pushed payloads and open a new stream after a disconnect.
     */
    private async consumeStream(
        iterator: AsyncIterator<YoutubeLiveChatMessagesPayload>,
        stream: YoutubeChatStream,
        generation: number,
    ): Promise<void> {
        let streamError: unknown

        try {
            while (this.isCurrentRun(generation)) {
                const result = await iterator.next()

                if (result.done || !this.isCurrentRun(generation)) {
                    break
                }

                this.processPayload(result.value, generation)
            }
        } catch (error) {
            streamError = error
        } finally {
            stream.close()
            if (this.stream === stream) {
                this.stream = undefined
            }
        }

        if (!this.isCurrentRun(generation)) {
            return
        }

        if (streamError) {
            const retryable = isRetryableYoutubeChatStreamError(streamError)

            if (!retryable) {
                this.isStarted = false
            }

            this.emitError(normalizeYoutubeChatStreamError(streamError))

            if (!retryable) {
                return
            }
        }

        this.scheduleStreamReconnect(generation)
    }

    /**
     * Delay reconnects to avoid tight loops and unnecessary quota usage.
     */
    private scheduleStreamReconnect(generation: number): void {
        if (!this.isCurrentRun(generation)) {
            return
        }

        this.transportTimeout = setTimeout(async () => {
            try {
                await this.openStream(generation)
            } catch (error) {
                if (!this.isCurrentRun(generation)) {
                    return
                }

                const retryable = isRetryableYoutubeChatStreamError(error)

                if (!retryable) {
                    this.isStarted = false
                }

                this.emitError(error)

                if (retryable) {
                    this.scheduleStreamReconnect(generation)
                }
            }
        }, STREAM_RECONNECT_INTERVAL_MS)
    }

    /**
     * Apply history filtering and track continuation tokens for polling only.
     */
    private processPayload(
        payload: YoutubeLiveChatMessagesPayload,
        generation: number,
        isInitial = false,
    ): void {
        if (this.request.transport !== "streamList") {
            this.pageToken = payload.nextPageToken ?? this.pageToken
        }

        if (isInitial && !this.includeHistory) {
            for (const message of payload.items ?? []) {
                if (message.id) {
                    this.seenMessageIds.remember(message.id)
                }
            }
        } else {
            this.emitNewMessages(payload.items ?? [], generation)
        }

        if (payload.offlineAt && generation === this.generation) {
            this.isStarted = false
        }
    }

    private isCurrentRun(generation: number): boolean {
        return this.isStarted && generation === this.generation
    }

    private assertCurrentRun(generation: number): void {
        if (!this.isCurrentRun(generation)) {
            throw new PlatformValidationError(
                "YouTube chat listener was stopped before startup completed.",
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }

    /**
     * Deduplicate and emit newly observed text chat messages.
     */
    private emitNewMessages(messages: YoutubeLiveChatMessage[], generation: number): void {
        for (const message of messages) {
            if (!this.isCurrentRun(generation)) {
                return
            }

            if (!message.id || !this.seenMessageIds.remember(message.id)) {
                continue
            }

            const normalizedMessage = normalizeYoutubeChatMessage(message, {
                channelId: this.setup?.channelId ?? null,
                channelDisplayName: this.setup?.channelDisplayName ?? null,
                includeRaw: this.includeRaw,
            })

            if (normalizedMessage) {
                this.emitMessage(normalizedMessage)
            }
        }
    }

    /**
     * Resolve the live chat id either directly from the request or by looking
     * up the active chat for the configured live video.
     */
    private async resolveSetup(): Promise<YoutubeChatSetup> {
        if (this.request.liveChatId) {
            return {
                liveChatId: this.request.liveChatId,
                liveVideoId: this.request.liveVideoId ?? null,
                channelId: null,
                channelDisplayName: null,
            }
        }

        let response

        try {
            response = await this.options.youtubeApiClient.videos.list({
                part: ["snippet", "liveStreamingDetails"],
                id: [this.request.liveVideoId as string],
            })
        } catch (error) {
            throw new PlatformApiError("YouTube API request failed.", {
                platform: YOUTUBE_PLATFORM,
                status: getGoogleApiErrorStatus(error),
                cause: error,
            })
        }

        const video = response.data.items?.[0]
        const liveChatId = video?.liveStreamingDetails?.activeLiveChatId

        if (!liveChatId) {
            throw new PlatformApiError(
                "YouTube active live chat id was not found.",
                {
                    platform: YOUTUBE_PLATFORM,
                    status: response.status,
                },
            )
        }

        return {
            liveChatId,
            liveVideoId: this.request.liveVideoId as string,
            channelId: video.snippet?.channelId ?? null,
            channelDisplayName: video.snippet?.channelTitle ?? null,
        }
    }

    /**
     * Fetch a page of YouTube live chat messages.
     */
    private async listMessages(): Promise<YoutubeLiveChatMessagesPayload> {
        if (!this.setup) {
            throw new PlatformValidationError(
                "YouTube chat listener has not been started.",
                { platform: YOUTUBE_PLATFORM },
            )
        }

        try {
            const response = await this.options.youtubeApiClient.liveChatMessages.list(
                {
                    liveChatId: this.setup.liveChatId,
                    part: ["id", "snippet", "authorDetails"],
                    maxResults: this.maxResults,
                    ...(this.pageToken ? { pageToken: this.pageToken } : {}),
                },
            )

            return response.data as YoutubeLiveChatMessagesPayload
        } catch (error) {
            throw new PlatformApiError("YouTube API request failed.", {
                platform: YOUTUBE_PLATFORM,
                status: getGoogleApiErrorStatus(error),
                cause: error,
            })
        }
    }
}

/**
 * Normalize a YouTube text live chat message into the shared chat message
 * shape. Non-text live chat events are skipped.
 */
function normalizeYoutubeChatMessage(
    message: YoutubeLiveChatMessage,
    options: {
        channelId: string | null
        channelDisplayName: string | null
        includeRaw: boolean
    },
): ChatMessage<"youtube"> | null {
    const text = message.snippet?.textMessageDetails?.messageText

    if (!text) {
        return null
    }

    return {
        platform: YOUTUBE_PLATFORM,
        type: "message",
        id: message.id ?? "",
        text,
        sentAt: normalizeDate(message.snippet?.publishedAt ?? undefined),
        author: {
            id: message.authorDetails?.channelId ?? null,
            username: null,
            displayName: message.authorDetails?.displayName ?? null,
        },
        channel: {
            id: options.channelId,
            slug: null,
            displayName: options.channelDisplayName,
        },
        ...(options.includeRaw ? { raw: message } : {}),
    }
}

/**
 * Validate user-supplied YouTube chat listener configuration.
 */
function validateYoutubeChatListenRequest(
    request: YoutubeChatListenRequest,
): asserts request is YoutubeChatListenRequest {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
        throw new PlatformValidationError("YouTube chat listen request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    for (const option of Object.keys(request)) {
        if (!SUPPORTED_YOUTUBE_CHAT_LISTEN_OPTIONS.has(option)) {
            throw new PlatformValidationError(
                `YouTube chat listen option "${option}" is not supported.`,
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }

    for (const option of ["liveChatId", "liveVideoId"] as const) {
        if (
            request[option] !== undefined &&
            (typeof request[option] !== "string" || !request[option].trim())
        ) {
            throw new PlatformValidationError(
                `${option} must be a non-empty string.`,
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }

    if (request.liveChatId !== undefined && request.liveVideoId !== undefined) {
        throw new PlatformValidationError(
            "Provide either liveChatId or liveVideoId, not both.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (!request.liveChatId && !request.liveVideoId) {
        throw new PlatformValidationError(
            "liveChatId or liveVideoId is required.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (
        request.transport !== undefined &&
        request.transport !== "polling" &&
        request.transport !== "streamList"
    ) {
        throw new PlatformValidationError(
            "transport must be polling or streamList.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (request.transport === "streamList") {
        for (const option of ["pollingIntervalMs", "maxResults"] as const) {
            if (request[option] !== undefined) {
                throw new PlatformValidationError(
                    `${option} is only supported with the polling transport.`,
                    { platform: YOUTUBE_PLATFORM },
                )
            }
        }
    }

    for (const option of ["includeHistory", "includeRaw"] as const) {
        if (request[option] !== undefined && typeof request[option] !== "boolean") {
            throw new PlatformValidationError(
                `${option} must be a boolean.`,
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }

    if (
        request.pollingIntervalMs !== undefined &&
        (!Number.isInteger(request.pollingIntervalMs) ||
            request.pollingIntervalMs <= 0 ||
            request.pollingIntervalMs > MAX_POLLING_INTERVAL_MS)
    ) {
        throw new PlatformValidationError(
            `pollingIntervalMs must be an integer between 1 and ${MAX_POLLING_INTERVAL_MS}.`,
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (
        request.maxResults !== undefined &&
        (!Number.isInteger(request.maxResults) ||
            request.maxResults < 200 || request.maxResults > 2000)
    ) {
        throw new PlatformValidationError(
            "maxResults must be an integer between 200 and 2000.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (
        request.maxRecentMessageIds !== undefined &&
        (
            !Number.isSafeInteger(request.maxRecentMessageIds) ||
            request.maxRecentMessageIds <= 0
        )
    ) {
        throw new PlatformValidationError(
            "maxRecentMessageIds must be a positive safe integer.",
            { platform: YOUTUBE_PLATFORM },
        )
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

function normalizePositiveInteger(value: string | undefined | null): number | null {
    if (typeof value !== "string") {
        return null
    }

    const normalizedValue = Number.parseInt(value, 10)

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
        return null
    }

    return normalizedValue
}

/**
 * Best-effort extraction of an HTTP status code from Google API client errors.
 */
function getGoogleApiErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object" || !("response" in error)) {
        return undefined
    }

    const response = error.response

    if (!response || typeof response !== "object" || !("status" in response)) {
        return undefined
    }

    const status = Number(response.status)

    return Number.isNaN(status) ? undefined : status
}
