import { PassThrough } from "node:stream"
import { setImmediate } from "node:timers/promises"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createYoutubeChatClient } from "../../src/providers/youtube/chat.js"
import {
    createYoutubeChatStream,
    type YoutubeChatStream,
} from "../../src/providers/youtube/chat-stream.js"
import type { GoogleYoutubeClient } from "../../src/providers/youtube/google-client.js"
import type {
    YoutubeChatListenRequest,
    YoutubeChatListener,
} from "../../src/providers/youtube/types.js"

vi.mock("../../src/providers/youtube/chat-stream.js", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../src/providers/youtube/chat-stream.js")>()

    return { ...original, createYoutubeChatStream: vi.fn() }
})

function createFakeStream() {
    const messages = new PassThrough({ objectMode: true })
    messages.on("error", () => {})
    const close = vi.fn(() => {
        messages.destroy()
    })

    return { messages, close }
}

function textMessage(id: string, text = "Hello YouTube chat") {
    return {
        id,
        snippet: {
            type: "TEXT_MESSAGE_EVENT",
            publishedAt: "2026-05-22T10:00:00Z",
            textMessageDetails: { messageText: text },
        },
        authorDetails: {
            channelId: "viewer-1",
            displayName: "Viewer 1",
        },
    }
}

function grpcError(code: number) {
    return Object.assign(new Error("YouTube stream failed"), { code })
}

async function settle() {
    await setImmediate()
}

describe("createYoutubeChatClient().listen", () => {
    const listeners: YoutubeChatListener[] = []
    const list = vi.fn()
    const videosList = vi.fn()
    const createStream = vi.mocked(createYoutubeChatStream)
    let youtubeApiClient: GoogleYoutubeClient

    function listen(request: Partial<YoutubeChatListenRequest> = {}) {
        const listener = createYoutubeChatClient({ youtubeApiClient }).listen({
            liveChatId: "chat-1",
            ...request,
        } as YoutubeChatListenRequest)
        listeners.push(listener)
        return listener
    }

    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
        youtubeApiClient = {
            liveChatMessages: { list },
            videos: { list: videosList },
        } as unknown as GoogleYoutubeClient
    })

    afterEach(async () => {
        await Promise.all(listeners.splice(0).map((listener) => listener.stop()))
        await settle()
        vi.useRealTimers()
    })

    it("keeps polling as the default and respects provider intervals and tokens", async () => {
        list.mockResolvedValueOnce({
            data: {
                items: [textMessage("history-1")],
                nextPageToken: "page-1",
                pollingIntervalMillis: 8000,
            },
        }).mockResolvedValueOnce({
            data: {
                items: [textMessage("history-1"), textMessage("message-1")],
                nextPageToken: "page-2",
                offlineAt: "2026-05-22T10:01:00Z",
            },
        })
        const listener = listen()
        const onMessage = vi.fn()
        listener.on("message", onMessage)

        await expect(listener.start()).resolves.toEqual({
            liveChatId: "chat-1",
            liveVideoId: null,
        })
        expect(onMessage).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(7999)
        expect(list).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1)

        expect(list).toHaveBeenNthCalledWith(2, {
            liveChatId: "chat-1",
            part: ["id", "snippet", "authorDetails"],
            maxResults: 200,
            pageToken: "page-1",
        })
        expect(onMessage).toHaveBeenCalledTimes(1)
        expect(onMessage.mock.calls[0][0].id).toBe("message-1")
        expect(onMessage.mock.calls[0][0]).not.toHaveProperty("raw")
        await vi.advanceTimersByTimeAsync(20000)
        expect(list).toHaveBeenCalledTimes(2)
        expect(createStream).not.toHaveBeenCalled()
    })

    it("resolves video setup and emits normalized streaming messages with raw data", async () => {
        videosList.mockResolvedValue({
            data: {
                items: [{
                    snippet: { channelId: "creator-1", channelTitle: "Creator 1" },
                    liveStreamingDetails: { activeLiveChatId: "resolved-chat" },
                }],
            },
        })
        const stream = createFakeStream()
        const message = textMessage("message-1")
        stream.messages.write({ items: [message], nextPageToken: "page-1" })
        createStream.mockResolvedValue(stream)
        const listener = listen({
            liveChatId: undefined,
            liveVideoId: "video-1",
            transport: "streamList",
            includeHistory: true,
            includeRaw: true,
        })
        const onMessage = vi.fn()
        listener.on("message", onMessage)

        await expect(listener.start()).resolves.toEqual({
            liveChatId: "resolved-chat",
            liveVideoId: "video-1",
        })
        expect(videosList).toHaveBeenCalledWith({
            part: ["snippet", "liveStreamingDetails"],
            id: ["video-1"],
        })
        expect(createStream).toHaveBeenCalledWith(youtubeApiClient, {
            liveChatId: "resolved-chat",
        })
        expect(onMessage).toHaveBeenCalledWith({
            platform: "youtube",
            type: "message",
            id: "message-1",
            text: "Hello YouTube chat",
            sentAt: "2026-05-22T10:00:00.000Z",
            author: { id: "viewer-1", username: null, displayName: "Viewer 1" },
            channel: { id: "creator-1", slug: null, displayName: "Creator 1" },
            raw: message,
        })
        expect(list).not.toHaveBeenCalled()
    })

    it("skips initial history, deduplicates messages, and ignores non-text events", async () => {
        const stream = createFakeStream()
        stream.messages.write({ items: [textMessage("history-1")], nextPageToken: "page-1" })
        createStream.mockResolvedValue(stream)
        const listener = listen({ transport: "streamList" })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        await listener.start()
        expect(onMessage).not.toHaveBeenCalled()

        stream.messages.write({
            items: [
                textMessage("history-1"),
                textMessage("message-1"),
                textMessage("message-1"),
                { id: "event-1", snippet: { type: "SUPER_CHAT_EVENT" } },
                textMessage(""),
            ],
            nextPageToken: "page-2",
        })
        await settle()
        expect(onMessage).toHaveBeenCalledTimes(1)
        expect(onMessage.mock.calls[0][0].id).toBe("message-1")
        expect(onMessage.mock.calls[0][0]).not.toHaveProperty("raw")
    })

    it("opens a new stream with supported arguments and deduplicates replayed history", async () => {
        const first = createFakeStream()
        const second = createFakeStream()
        first.messages.write({ items: [textMessage("history-1")], nextPageToken: "page-1" })
        second.messages.write({
            items: [textMessage("history-1"), textMessage("message-1"), textMessage("message-2")],
            nextPageToken: "page-3",
        })
        createStream.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
        const listener = listen({ transport: "streamList" })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        await listener.start()

        first.messages.write({ items: [textMessage("message-1")], nextPageToken: "page-2" })
        first.messages.write({ items: [] })
        first.messages.end()
        await settle()
        expect(first.close).toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(4999)
        expect(createStream).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1)
        await settle()

        expect(createStream).toHaveBeenNthCalledWith(1, youtubeApiClient, {
            liveChatId: "chat-1",
        })
        expect(createStream).toHaveBeenNthCalledWith(2, youtubeApiClient, {
            liveChatId: "chat-1",
        })
        expect(onMessage.mock.calls.map(([message]) => message.id)).toEqual([
            "message-1", "message-2",
        ])
    })

    it("wraps transient failures and retries failed reconnections", async () => {
        const first = createFakeStream()
        const next = createFakeStream()
        first.messages.write({ items: [], nextPageToken: "page-1" })
        next.messages.write({ items: [textMessage("message-1")], nextPageToken: "page-2" })
        createStream.mockResolvedValueOnce(first)
            .mockRejectedValueOnce(grpcError(14))
            .mockResolvedValueOnce(next)
        const listener = listen({ transport: "streamList" })
        const onError = vi.fn()
        const onMessage = vi.fn()
        listener.on("error", onError).on("message", onMessage)
        await listener.start()

        const error = grpcError(8)
        first.messages.destroy(error)
        await settle()
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            name: "PlatformApiError", platform: "youtube", status: 429, cause: error,
        }))
        await vi.advanceTimersByTimeAsync(5000)
        await settle()
        expect(onError).toHaveBeenCalledTimes(2)
        expect(onError.mock.calls[1][0].status).toBe(503)
        await vi.advanceTimersByTimeAsync(5000)
        await settle()
        expect(createStream).toHaveBeenCalledTimes(3)
        expect(onMessage.mock.calls[0][0].id).toBe("message-1")
        expect(list).not.toHaveBeenCalled()
    })

    it.each([3, 5, 7, 9, 16])("does not reconnect after terminal gRPC error %i", async (code) => {
        const stream = createFakeStream()
        stream.messages.write({ items: [], nextPageToken: "page-1" })
        createStream.mockResolvedValue(stream)
        const listener = listen({ transport: "streamList" })
        const onError = vi.fn()
        listener.on("error", onError)
        await listener.start()

        stream.messages.destroy(grpcError(code))
        await settle()
        await vi.advanceTimersByTimeAsync(20000)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0][0]).toBeInstanceOf(PlatformApiError)
        expect(createStream).toHaveBeenCalledTimes(1)
        expect(stream.close).toHaveBeenCalled()
    })

    it("allows an error handler to restart after a terminal stream failure", async () => {
        const first = createFakeStream()
        const second = createFakeStream()
        first.messages.write({ items: [], nextPageToken: "page-1" })
        second.messages.write({ items: [], nextPageToken: "page-2" })
        createStream.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
        const listener = listen({ transport: "streamList" })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        listener.on("error", async () => {
            await listener.start()
        })
        await listener.start()
        first.messages.destroy(grpcError(9))
        await settle()
        second.messages.write({ items: [textMessage("message-1")] })
        await settle()
        expect(createStream).toHaveBeenCalledTimes(2)
        expect(onMessage.mock.calls[0][0].id).toBe("message-1")
    })

    it("retries a reconnect that closes before returning a payload", async () => {
        const first = createFakeStream()
        const empty = createFakeStream()
        const third = createFakeStream()
        first.messages.write({ items: [], nextPageToken: "page-1" })
        empty.messages.end()
        third.messages.write({ items: [textMessage("message-1")], nextPageToken: "page-2" })
        createStream.mockResolvedValueOnce(first).mockResolvedValueOnce(empty).mockResolvedValueOnce(third)
        const listener = listen({ transport: "streamList" })
        const onError = vi.fn()
        listener.on("error", onError)
        await listener.start()
        first.messages.end()
        await settle()
        await vi.advanceTimersByTimeAsync(5000)
        await settle()
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }))
        await vi.advanceTimersByTimeAsync(5000)
        await settle()
        expect(createStream).toHaveBeenCalledTimes(3)
    })

    it("stops when the stream reports offlineAt", async () => {
        const stream = createFakeStream()
        stream.messages.write({ items: [], nextPageToken: "page-1" })
        createStream.mockResolvedValue(stream)
        const listener = listen({ transport: "streamList" })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        await listener.start()

        stream.messages.write({
            items: [textMessage("last-message")],
            offlineAt: "2026-05-22T10:01:00Z",
        })
        await settle()
        await vi.advanceTimersByTimeAsync(20000)
        expect(onMessage.mock.calls[0][0].id).toBe("last-message")
        expect(stream.close).toHaveBeenCalled()
        expect(createStream).toHaveBeenCalledTimes(1)
    })

    it("closes an already offline initial stream without scheduling a reconnect", async () => {
        const stream = createFakeStream()
        stream.messages.write({ offlineAt: "2026-05-22T10:01:00Z" })
        createStream.mockResolvedValue(stream)
        await listen({ transport: "streamList" }).start()
        await vi.advanceTimersByTimeAsync(10000)
        expect(stream.close).toHaveBeenCalled()
        expect(createStream).toHaveBeenCalledTimes(1)
    })

    it("rejects startup failures and allows startup to be retried", async () => {
        const first = createFakeStream()
        const second = createFakeStream()
        second.messages.write({ items: [] })
        createStream.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
        const listener = listen({ transport: "streamList" })
        const starting = listener.start()
        const rejection = expect(starting).rejects.toMatchObject({
            name: "PlatformApiError", platform: "youtube", status: 403,
        })
        await settle()
        first.messages.destroy(grpcError(7))
        await rejection
        expect(first.close).toHaveBeenCalled()

        await expect(listener.start()).resolves.toMatchObject({ liveChatId: "chat-1" })
        expect(createStream).toHaveBeenCalledTimes(2)
    })

    it("rejects a stream that ends before returning its first payload", async () => {
        const stream = createFakeStream()
        stream.messages.end()
        createStream.mockResolvedValue(stream)
        await expect(listen({ transport: "streamList" }).start()).rejects.toBeInstanceOf(PlatformApiError)
        expect(stream.close).toHaveBeenCalled()
    })

    it("shares concurrent startup work and does not open additional active streams", async () => {
        const stream = createFakeStream()
        createStream.mockResolvedValue(stream)
        const listener = listen({ transport: "streamList" })
        const firstStart = listener.start()
        const secondStart = listener.start()
        await settle()
        expect(createStream).toHaveBeenCalledTimes(1)
        stream.messages.write({ items: [], nextPageToken: "page-1" })
        await Promise.all([firstStart, secondStart])
        await listener.start()
        expect(createStream).toHaveBeenCalledTimes(1)
    })

    it("cancels active streams and clears pending reconnects on stop", async () => {
        const stream = createFakeStream()
        stream.messages.write({ items: [], nextPageToken: "page-1" })
        createStream.mockResolvedValue(stream)
        const listener = listen({ transport: "streamList" })
        const onError = vi.fn()
        listener.on("error", onError)
        await listener.start()
        await listener.stop()
        await settle()
        await vi.advanceTimersByTimeAsync(10000)
        expect(stream.close).toHaveBeenCalled()
        expect(createStream).toHaveBeenCalledTimes(1)
        expect(onError).not.toHaveBeenCalled()

        const next = createFakeStream()
        next.messages.write({ items: [], nextPageToken: "page-2" })
        createStream.mockResolvedValueOnce(next)
        await listener.start()
        next.messages.end()
        await settle()
        await listener.stop()
        await vi.advanceTimersByTimeAsync(10000)
        expect(createStream).toHaveBeenCalledTimes(2)
    })

    it("closes a stream opened after stop while authentication was pending", async () => {
        let resolveStream!: (stream: YoutubeChatStream) => void
        createStream.mockReturnValue(new Promise((resolve) => { resolveStream = resolve }))
        const listener = listen({ transport: "streamList" })
        const starting = listener.start()
        const rejection = expect(starting).rejects.toBeInstanceOf(PlatformValidationError)
        await settle()
        await listener.stop()
        const stream = createFakeStream()
        resolveStream(stream)
        await rejection
        expect(stream.close).toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(10000)
        expect(createStream).toHaveBeenCalledTimes(1)
    })

    it("rejects pending startup when stopped before the first payload", async () => {
        const stream = createFakeStream()
        createStream.mockResolvedValue(stream)
        const listener = listen({ transport: "streamList" })
        const onError = vi.fn()
        listener.on("error", onError)
        const starting = listener.start()
        const rejection = expect(starting).rejects.toBeDefined()
        await settle()
        await listener.stop()
        await rejection
        expect(stream.close).toHaveBeenCalled()
        expect(onError).not.toHaveBeenCalled()
    })

    it("preserves message handlers across stop and restart", async () => {
        const first = createFakeStream()
        const second = createFakeStream()
        first.messages.write({ items: [], nextPageToken: "page-1" })
        second.messages.write({ items: [textMessage("message-1")], nextPageToken: "page-2" })
        createStream.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
        const listener = listen({ transport: "streamList", includeHistory: true })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        await listener.start()
        await listener.stop()
        await listener.start()
        expect(onMessage.mock.calls[0][0].id).toBe("message-1")

        listener.off("message", onMessage)
        second.messages.write({ items: [textMessage("message-2")] })
        await settle()
        expect(onMessage).toHaveBeenCalledTimes(1)
    })

    it("ignores a polling response that arrives after stop", async () => {
        let resolvePoll!: (response: unknown) => void
        list.mockResolvedValueOnce({ data: { items: [], nextPageToken: "page-1" } })
            .mockReturnValueOnce(new Promise((resolve) => { resolvePoll = resolve }))
        const listener = listen({ transport: "polling" })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        await listener.start()
        await vi.advanceTimersByTimeAsync(5000)
        await listener.stop()
        resolvePoll({ data: { items: [textMessage("late-message")] } })
        await settle()
        await vi.advanceTimersByTimeAsync(10000)
        expect(onMessage).not.toHaveBeenCalled()
        expect(list).toHaveBeenCalledTimes(2)
    })

    it("can retry startup after an initial polling failure", async () => {
        list.mockRejectedValueOnce({ response: { status: 403 } })
            .mockResolvedValueOnce({ data: { items: [] } })
        const listener = listen()
        await expect(listener.start()).rejects.toMatchObject({
            name: "PlatformApiError", status: 403, platform: "youtube",
        })
        await listener.start()
        expect(list).toHaveBeenCalledTimes(2)
    })

    it("honors a configured polling interval larger than Google's interval", async () => {
        list.mockResolvedValueOnce({
            data: { items: [], pollingIntervalMillis: 1000 },
        }).mockResolvedValueOnce({
            data: { items: [], offlineAt: "2026-05-22T10:01:00Z" },
        })
        await listen({ pollingIntervalMs: 7000 }).start()
        await vi.advanceTimersByTimeAsync(6999)
        expect(list).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(list).toHaveBeenCalledTimes(2)
    })

    it("respects provider intervals longer than Node's maximum timer delay", async () => {
        const providerIntervalMs = 2147484647
        list.mockResolvedValueOnce({
            data: { items: [], pollingIntervalMillis: providerIntervalMs },
        }).mockResolvedValueOnce({
            data: { items: [], offlineAt: "2026-05-22T10:01:00Z" },
        })
        await listen().start()
        await vi.advanceTimersByTimeAsync(providerIntervalMs - 1)
        expect(list).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(list).toHaveBeenCalledTimes(2)
    })

    it.each([200, 2000])("honors polling maxResults=%i at the documented bounds", async (maxResults) => {
        list.mockResolvedValue({
            data: { items: [], offlineAt: "2026-05-22T10:01:00Z" },
        })
        await listen({ transport: "polling", maxResults }).start()
        expect(list).toHaveBeenCalledWith({
            liveChatId: "chat-1",
            part: ["id", "snippet", "authorDetails"],
            maxResults,
        })
        expect(videosList).not.toHaveBeenCalled()
    })

    it("honors the configured bound on local streaming deduplication", async () => {
        const stream = createFakeStream()
        stream.messages.write({ items: [textMessage("message-1"), textMessage("message-2")] })
        createStream.mockResolvedValue(stream)
        const listener = listen({
            transport: "streamList", includeHistory: true, maxRecentMessageIds: 2,
        })
        const onMessage = vi.fn()
        listener.on("message", onMessage)
        await listener.start()
        stream.messages.write({ items: [textMessage("message-1"), textMessage("message-3")] })
        await settle()
        stream.messages.write({ items: [textMessage("message-1")] })
        await settle()
        expect(onMessage.mock.calls.map(([message]) => message.id)).toEqual([
            "message-1", "message-2", "message-3", "message-1",
        ])
    })

    it.each([
        [null, "YouTube chat listen request is required."],
        [[], "YouTube chat listen request is required."],
        [{}, "liveChatId or liveVideoId is required."],
        [{ liveChatId: " " }, "liveChatId must be a non-empty string."],
        [{ liveVideoId: " " }, "liveVideoId must be a non-empty string."],
        [{ liveChatId: 123 }, "liveChatId must be a non-empty string."],
        [{ liveVideoId: null }, "liveVideoId must be a non-empty string."],
        [{ liveChatId: "chat-1", liveVideoId: "video-1" }, "Provide either liveChatId or liveVideoId, not both."],
        [{ liveChatId: "chat-1", transport: "streamList", maxResults: 500 }, "maxResults is only supported with the polling transport."],
        [{ liveChatId: "chat-1", transport: "streamList", pollingIntervalMs: 5000 }, "pollingIntervalMs is only supported with the polling transport."],
        [{ liveChatId: "chat-1", pageToken: "page-1" }, "YouTube chat listen option \"pageToken\" is not supported."],
        [{ liveChatId: "chat-1", transport: "streamList", pageToken: "page-1" }, "YouTube chat listen option \"pageToken\" is not supported."],
        [{ liveChatId: "chat-1", transport: "streamList", hl: "en" }, "YouTube chat listen option \"hl\" is not supported."],
        [{ liveChatId: "chat-1", profileImageSize: 88 }, "YouTube chat listen option \"profileImageSize\" is not supported."],
        [{ liveChatId: "chat-1", includeHistory: "true" }, "includeHistory must be a boolean."],
        [{ liveChatId: "chat-1", includeRaw: 1 }, "includeRaw must be a boolean."],
        [{ liveChatId: "chat-1", maxResults: 199 }, "maxResults must be an integer between 200 and 2000."],
        [{ liveChatId: "chat-1", maxResults: 2001 }, "maxResults must be an integer between 200 and 2000."],
        [{ liveChatId: "chat-1", maxResults: 200.5 }, "maxResults must be an integer between 200 and 2000."],
        [{ liveChatId: "chat-1", pollingIntervalMs: 0 }, "pollingIntervalMs must be an integer between 1 and 2147483647."],
        [{ liveChatId: "chat-1", pollingIntervalMs: 2147483648 }, "pollingIntervalMs must be an integer between 1 and 2147483647."],
        [{ liveChatId: "chat-1", maxRecentMessageIds: 0 }, "maxRecentMessageIds must be a positive safe integer."],
        [{ liveChatId: "chat-1", maxRecentMessageIds: 1.5 }, "maxRecentMessageIds must be a positive safe integer."],
        [{ liveChatId: "chat-1", maxRecentMessageIds: Number.MAX_SAFE_INTEGER + 1 }, "maxRecentMessageIds must be a positive safe integer."],
    ])("rejects invalid configuration %j before contacting Google", (request, message) => {
        const chat = createYoutubeChatClient({ youtubeApiClient })
        expect(() => chat.listen(request as unknown as YoutubeChatListenRequest)).toThrow(message)
        expect(list).not.toHaveBeenCalled()
        expect(videosList).not.toHaveBeenCalled()
        expect(createStream).not.toHaveBeenCalled()
    })

    it("rejects unsupported transports before any API request", () => {
        expect(() => listen({
            transport: "invalid" as YoutubeChatListenRequest["transport"],
        })).toThrow(PlatformValidationError)
        expect(createStream).not.toHaveBeenCalled()
        expect(list).not.toHaveBeenCalled()
    })
})
