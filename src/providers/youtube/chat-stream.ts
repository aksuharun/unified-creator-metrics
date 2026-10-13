import { Client, Metadata, credentials, status } from "@grpc/grpc-js"
import { loadSync, type MethodDefinition, type ServiceDefinition } from "@grpc/proto-loader"
import { fileURLToPath } from "node:url"
import { PlatformApiError, PlatformValidationError } from "../../errors.js"
import { YOUTUBE_PLATFORM } from "./constants.js"
import type { GoogleYoutubeClient } from "./google-client.js"

export type YoutubeLiveChatMessage = {
    id?: string | null
    snippet?: {
        type?: string | number | null
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

export type YoutubeLiveChatMessagesPayload = {
    items?: YoutubeLiveChatMessage[]
    nextPageToken?: string | null
    pollingIntervalMillis?: number | null
    offlineAt?: string | null
}

type YoutubeChatStreamRequest = {
    liveChatId: string
}

export type YoutubeChatStream = {
    messages: AsyncIterable<YoutubeLiveChatMessagesPayload>
    close(): void
}

let streamListMethod: MethodDefinition<
    YoutubeChatStreamRequest & { part: string[] },
    YoutubeLiveChatMessagesPayload
> | undefined

/**
 * Open YouTube's documented gRPC stream using the existing Google client auth.
 */
export async function createYoutubeChatStream(
    youtubeApiClient: GoogleYoutubeClient,
    request: YoutubeChatStreamRequest,
): Promise<YoutubeChatStream> {
    validateYoutubeChatStreamRequest(request)
    const metadata = new Metadata()
    const auth = youtubeApiClient.context._options.auth

    if (typeof auth === "string") {
        metadata.set("x-goog-api-key", auth)
    } else if (auth) {
        const headers = await auth.getRequestHeaders("https://youtube.googleapis.com")

        headers.forEach((value, name) => {
            metadata.set(name, value)
        })
    }

    const method = getStreamListMethod()
    const client = new Client("youtube.googleapis.com:443", credentials.createSsl())

    try {
        const messages = client.makeServerStreamRequest(
            method.path,
            method.requestSerialize,
            method.responseDeserialize,
            {
                liveChatId: request.liveChatId,
                part: ["id", "snippet", "authorDetails"],
            },
            metadata,
        )

        // Cancellation can happen before an async iterator is attached.
        messages.on("error", () => {
            // Active consumers receive this error through the async iterator.
        })
        let isClosed = false

        return {
            messages,
            close() {
                if (isClosed) {
                    return
                }

                isClosed = true
                messages.cancel()
                client.close()
            },
        }
    } catch (error) {
        client.close()
        throw error
    }
}

/**
 * Reject unsupported stream arguments instead of silently discarding them.
 */
function validateYoutubeChatStreamRequest(request: YoutubeChatStreamRequest): void {
    if (
        !request || typeof request !== "object" || Array.isArray(request) ||
        typeof request.liveChatId !== "string" || !request.liveChatId.trim()
    ) {
        throw new PlatformValidationError("liveChatId must be a non-empty string.", {
            platform: YOUTUBE_PLATFORM,
        })
    }

    for (const option of Object.keys(request)) {
        if (option !== "liveChatId") {
            throw new PlatformValidationError(
                `YouTube chat stream option "${option}" is not supported.`,
                { platform: YOUTUBE_PLATFORM },
            )
        }
    }
}

/**
 * Load the provider protocol lazily so polling does not initialize gRPC.
 */
function getStreamListMethod(): NonNullable<typeof streamListMethod> {
    if (!streamListMethod) {
        const definition = loadSync(
            fileURLToPath(new URL("./stream-list.proto", import.meta.url)),
            { longs: String, enums: String },
        )
        const service = definition[
            "youtube.api.v3.V3DataLiveChatMessageService"
        ] as ServiceDefinition

        streamListMethod = service.StreamList as NonNullable<typeof streamListMethod>
    }

    return streamListMethod
}

/**
 * Map gRPC failures to the library's HTTP-style provider error context.
 */
export function normalizeYoutubeChatStreamError(error: unknown): PlatformApiError {
    if (error instanceof PlatformApiError) {
        return error
    }

    const code = getGrpcErrorCode(error)
    const httpStatuses: Partial<Record<status, number>> = {
        [status.CANCELLED]: 499,
        [status.INVALID_ARGUMENT]: 400,
        [status.DEADLINE_EXCEEDED]: 504,
        [status.NOT_FOUND]: 404,
        [status.ALREADY_EXISTS]: 409,
        [status.PERMISSION_DENIED]: 403,
        [status.RESOURCE_EXHAUSTED]: 429,
        [status.FAILED_PRECONDITION]: 400,
        [status.ABORTED]: 409,
        [status.OUT_OF_RANGE]: 400,
        [status.UNIMPLEMENTED]: 501,
        [status.INTERNAL]: 500,
        [status.UNAVAILABLE]: 503,
        [status.DATA_LOSS]: 500,
        [status.UNAUTHENTICATED]: 401,
        [status.UNKNOWN]: 500,
    }

    return new PlatformApiError("YouTube API request failed.", {
        platform: YOUTUBE_PLATFORM,
        status: code === undefined ? getGoogleApiErrorStatus(error) : httpStatuses[code],
        cause: error,
    })
}

/**
 * Reconnect only after transient transport or rate-limit failures.
 */
export function isRetryableYoutubeChatStreamError(error: unknown): boolean {
    const cause = error instanceof PlatformApiError ? error.cause : error
    const code = getGrpcErrorCode(cause)

    if (code !== undefined) {
        return [
            status.UNKNOWN,
            status.DEADLINE_EXCEEDED,
            status.RESOURCE_EXHAUSTED,
            status.ABORTED,
            status.INTERNAL,
            status.UNAVAILABLE,
        ].includes(code)
    }

    const httpStatus = error instanceof PlatformApiError
        ? error.status
        : getGoogleApiErrorStatus(error)

    return httpStatus !== undefined && [429, 500, 502, 503, 504].includes(httpStatus)
}

function getGrpcErrorCode(error: unknown): status | undefined {
    if (!error || typeof error !== "object" || !("code" in error)) {
        return undefined
    }

    return typeof error.code === "number" &&
        Number.isInteger(error.code) &&
        error.code >= status.OK &&
        error.code <= status.UNAUTHENTICATED
        ? error.code
        : undefined
}

/**
 * Preserve HTTP status context for failures while refreshing Google auth.
 */
function getGoogleApiErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object" || !("response" in error)) {
        return undefined
    }

    const response = error.response

    if (!response || typeof response !== "object" || !("status" in response)) {
        return undefined
    }

    const httpStatus = Number(response.status)

    return Number.isNaN(httpStatus) ? undefined : httpStatus
}
