import { ChatListenerEmitter } from "../../chat-listener.js"
import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { RecentIdTracker } from "../../recent-message-ids.js"
import type { ChatMessage } from "../../types.js"
import { YOUTUBE_PLATFORM } from "./constants.js"
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

type YoutubeLiveChatMessage = {
    id?: string | null
    snippet?: {
        type?: string | null
        publishedAt?: string | null
        textMessageDetails?: {
            messageText?: string | null
        } | null
    } | null
    authorDetails?: {
        channelId?: string | null
        channelUrl?: string | null
        displayName?: string | null
    } | null
}

type YoutubeChatSetup = {
    liveChatId: string
    liveVideoId: string | null
    channelId: string | null
    channelDisplayName: string | null
}

type YoutubeLiveChatMessagesPayload = {
    items?: YoutubeLiveChatMessage[]
    nextPageToken?: string | null
    pollingIntervalMillis?: number | null
    offlineAt?: string | null
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
 * YouTube chat listener implementation backed by live chat polling.
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
    private pollTimeout: ReturnType<typeof setTimeout> | undefined

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
     * Resolve live chat setup, fetch the initial page, and begin polling.
     */
    async start(): Promise<YoutubeChatStartResult> {
        if (this.isStarted && this.setup) {
            return {
                liveChatId: this.setup.liveChatId,
                liveVideoId: this.setup.liveVideoId,
            }
        }

        this.setup = await this.resolveSetup()
        this.isStarted = true

        const payload = await this.listMessages()
        this.pageToken = payload.nextPageToken ?? undefined

        if (this.includeHistory) {
            this.emitNewMessages(payload.items ?? [])
        } else {
            for (const message of payload.items ?? []) {
                if (message.id) {
                    this.seenMessageIds.remember(message.id)
                }
            }
        }

        if (payload.offlineAt) {
            this.isStarted = false
        } else {
            this.scheduleNextPoll(payload.pollingIntervalMillis ?? undefined)
        }

        return {
            liveChatId: this.setup.liveChatId,
            liveVideoId: this.setup.liveVideoId,
        }
    }

    /**
     * Stop polling for additional YouTube live chat messages.
     */
    async stop(): Promise<void> {
        this.isStarted = false

        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout)
            this.pollTimeout = undefined
        }

        await super.stop()
    }

    /**
     * Poll the YouTube live chat API once and schedule the next iteration.
     */
    private async poll(): Promise<void> {
        if (!this.isStarted) {
            return
        }

        try {
            const payload = await this.listMessages()
            this.pageToken = payload.nextPageToken ?? undefined
            this.emitNewMessages(payload.items ?? [])

            if (payload.offlineAt) {
                this.isStarted = false
                return
            }

            this.scheduleNextPoll(payload.pollingIntervalMillis ?? undefined)
        } catch (error) {
            this.emitError(error)

            if (this.isStarted) {
                this.scheduleNextPoll()
            }
        }
    }

    /**
     * Schedule the next poll using the larger of the configured interval and
     * the provider-requested interval.
     */
    private scheduleNextPoll(providerPollingIntervalMs?: number): void {
        if (!this.isStarted) {
            return
        }

        const delay = Math.max(
            this.pollingIntervalMs,
            providerPollingIntervalMs ?? 0,
        )

        this.pollTimeout = setTimeout(() => {
            void this.poll()
        }, delay)
    }

    /**
     * Deduplicate and emit newly observed text chat messages.
     */
    private emitNewMessages(messages: YoutubeLiveChatMessage[]): void {
        for (const message of messages) {
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
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("YouTube chat listen request is required.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    if (!request.liveChatId && !request.liveVideoId) {
        throw new PlatformValidationError(
            "liveChatId or liveVideoId is required.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (
        request.pollingIntervalMs !== undefined &&
        (!Number.isInteger(request.pollingIntervalMs) ||
            request.pollingIntervalMs <= 0)
    ) {
        throw new PlatformValidationError(
            "pollingIntervalMs must be a positive integer.",
            { platform: YOUTUBE_PLATFORM },
        )
    }

    if (
        request.maxResults !== undefined &&
        (!Number.isInteger(request.maxResults) || request.maxResults <= 0)
    ) {
        throw new PlatformValidationError(
            "maxResults must be a positive integer.",
            { platform: YOUTUBE_PLATFORM },
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
