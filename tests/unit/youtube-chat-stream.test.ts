import { Client, type ClientReadableStream, Metadata, status } from "@grpc/grpc-js"
import { PassThrough } from "node:stream"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createGoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"
import {
    createYoutubeChatStream,
    isRetryableYoutubeChatStreamError,
    normalizeYoutubeChatStreamError,
} from "../../src/providers/youtube/chat-stream.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"

function googleClient(auth: unknown) {
    return { context: { _options: { auth } } } as unknown as GoogleYoutubeClient
}

// Encode the documented protobuf field numbers independently of the schema.
function varint(value: number): Buffer {
    const bytes = []
    do {
        bytes.push((value & 0x7f) | (value > 0x7f ? 0x80 : 0))
        value = Math.floor(value / 128)
    } while (value)
    return Buffer.from(bytes)
}

function field(number: number, value: string | Buffer): Buffer {
    const bytes = typeof value === "string" ? Buffer.from(value) : value
    return Buffer.concat([varint(number * 8 + 2), varint(bytes.length), bytes])
}

describe("YouTube chat streaming transport", () => {
    let messages: PassThrough & { cancel: ReturnType<typeof vi.fn> }

    beforeEach(() => {
        messages = Object.assign(new PassThrough({ objectMode: true }), {
            cancel: vi.fn(),
        })
        vi.spyOn(Client.prototype, "makeServerStreamRequest").mockReturnValue(
            messages as unknown as ClientReadableStream<unknown>,
        )
        vi.spyOn(Client.prototype, "close")
    })

    afterEach(() => {
        messages.destroy()
        vi.restoreAllMocks()
    })

    it("calls the official service with API-key auth and closes its channel once", async () => {
        const stream = await createYoutubeChatStream(googleClient("api-key-1"), {
            liveChatId: "chat-1",
        })
        const [path, serialize, deserialize, request, metadata] = vi.mocked(
            Client.prototype.makeServerStreamRequest,
        ).mock.calls[0]
        expect(path).toBe("/youtube.api.v3.V3DataLiveChatMessageService/StreamList")
        expect(metadata).toBeInstanceOf(Metadata)
        expect((metadata as Metadata).get("x-goog-api-key")).toEqual(["api-key-1"])
        expect(request).toEqual({
            liveChatId: "chat-1",
            part: ["id", "snippet", "authorDetails"],
        })
        // Streaming request fields: live_chat_id=1, part=100; omit fields 98/99.
        const expectedRequest = Buffer.concat([
            field(1, "chat-1"),
            field(100, "id"), field(100, "snippet"), field(100, "authorDetails"),
        ])
        expect(serialize(request)).toEqual(expectedRequest)

        // Response fields: next_page_token=100602, items=1007; id=101.
        const response = Buffer.concat([
            field(100602, "page-2"),
            field(1007, Buffer.concat([
                field(101, "message-1"),
                field(2, Buffer.concat([
                    field(4, "2026-05-22T10:00:00Z"),
                    field(19, field(1, "Hello chat")),
                ])),
                field(3, Buffer.concat([
                    field(10101, "viewer-1"), field(103, "Viewer 1"),
                ])),
            ])),
        ])
        expect(deserialize(response)).toEqual({
            nextPageToken: "page-2",
            items: [{
                id: "message-1",
                snippet: {
                    publishedAt: "2026-05-22T10:00:00Z",
                    textMessageDetails: { messageText: "Hello chat" },
                },
                authorDetails: { channelId: "viewer-1", displayName: "Viewer 1" },
            }],
        })

        stream.close()
        stream.close()
        expect(messages.cancel).toHaveBeenCalledTimes(1)
        expect(Client.prototype.close).toHaveBeenCalledTimes(1)
    })

    it.each([
        { maxResults: 500 },
        { pageToken: "page-1" },
        { pollingIntervalMs: 5000 },
        { hl: "en" },
        { profileImageSize: 88 },
    ])("rejects unsupported stream arguments %j instead of ignoring them", async (options) => {
        const getRequestHeaders = vi.fn()
        const request = { liveChatId: "chat-1", ...options }
        await expect(createYoutubeChatStream(googleClient({ getRequestHeaders }), request))
            .rejects.toBeInstanceOf(PlatformValidationError)
        expect(getRequestHeaders).not.toHaveBeenCalled()
        expect(Client.prototype.makeServerStreamRequest).not.toHaveBeenCalled()
    })

    it.each([
        { apiKey: "api-key-1" },
        { accessToken: "access-token-1" },
        { apiKey: "api-key-1", accessToken: "access-token-1" },
    ])("uses auth from the actual Google SDK client for %j", async (config) => {
        const client = createGoogleYoutubeClient(config)
        const stream = await createYoutubeChatStream(client, { liveChatId: "chat-1" })
        const metadata = vi.mocked(Client.prototype.makeServerStreamRequest).mock.calls[0][4] as Metadata

        if (config.accessToken) {
            expect(metadata.get("authorization")).toEqual([`Bearer ${config.accessToken}`])
            expect(metadata.get("x-goog-api-key")).toEqual([])
        } else {
            expect(metadata.get("x-goog-api-key")).toEqual([config.apiKey])
        }
        stream.close()
    })

    it("obtains fresh OAuth headers for every connection using the Google auth client", async () => {
        const getRequestHeaders = vi.fn()
            .mockResolvedValueOnce(new Headers({ authorization: "Bearer token-1" }))
            .mockResolvedValueOnce(new Headers({ authorization: "Bearer token-2" }))
        const client = googleClient({ getRequestHeaders })

        for (const token of ["token-1", "token-2"]) {
            const stream = await createYoutubeChatStream(client, { liveChatId: "chat-1" })
            const calls = vi.mocked(Client.prototype.makeServerStreamRequest).mock.calls
            const metadata = calls[calls.length - 1][4] as Metadata
            expect(metadata.get("authorization")).toEqual([`Bearer ${token}`])
            stream.close()
        }
        expect(getRequestHeaders).toHaveBeenCalledTimes(2)
        expect(getRequestHeaders).toHaveBeenCalledWith("https://youtube.googleapis.com")
    })

    it("does not create a stream when obtaining OAuth headers fails", async () => {
        const cause = new Error("Token refresh failed")
        const client = googleClient({ getRequestHeaders: vi.fn().mockRejectedValue(cause) })
        await expect(createYoutubeChatStream(client, {
            liveChatId: "chat-1",
        })).rejects.toBe(cause)
        expect(Client.prototype.makeServerStreamRequest).not.toHaveBeenCalled()
    })

    it("closes the channel if starting the gRPC call throws", async () => {
        const cause = new Error("Unable to open stream")
        vi.mocked(Client.prototype.makeServerStreamRequest).mockImplementation(() => { throw cause })
        await expect(createYoutubeChatStream(googleClient("api-key-1"), {
            liveChatId: "chat-1",
        })).rejects.toBe(cause)
        expect(Client.prototype.close).toHaveBeenCalledTimes(1)
    })

    it("preserves HTTP context from Google auth errors and retries transient failures", () => {
        const cause = { code: 503, response: { status: 503 } }
        const error = normalizeYoutubeChatStreamError(cause)
        expect(error).toMatchObject({ platform: "youtube", status: 503, cause })
        expect(isRetryableYoutubeChatStreamError(error)).toBe(true)
        expect(isRetryableYoutubeChatStreamError({ response: { status: 401 } })).toBe(false)
    })

    it.each([
        [status.PERMISSION_DENIED, 403, false],
        [status.UNAUTHENTICATED, 401, false],
        [status.NOT_FOUND, 404, false],
        [status.FAILED_PRECONDITION, 400, false],
        [status.RESOURCE_EXHAUSTED, 429, true],
        [status.UNAVAILABLE, 503, true],
    ])("normalizes gRPC code %i with HTTP status and retryability", (code, httpStatus, retryable) => {
        const cause = Object.assign(new Error("Stream failed"), { code })
        const error = normalizeYoutubeChatStreamError(cause)
        expect(error).toMatchObject({
            name: "PlatformApiError", platform: "youtube", status: httpStatus, cause,
        })
        expect(isRetryableYoutubeChatStreamError(cause)).toBe(retryable)
        expect(isRetryableYoutubeChatStreamError(error)).toBe(retryable)
        expect(normalizeYoutubeChatStreamError(error)).toBe(error)
    })
})
