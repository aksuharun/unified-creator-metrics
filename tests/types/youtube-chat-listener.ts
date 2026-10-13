import type {
    MultiPlatformYoutubeChatListenRequest,
    YoutubeChatListenRequest,
} from "../../src/index.js"

function acceptsYoutubeRequest(request: YoutubeChatListenRequest): void {
    void request
}

function acceptsMultiPlatformRequest(request: MultiPlatformYoutubeChatListenRequest): void {
    void request
}

acceptsYoutubeRequest({ liveChatId: "chat-1" })
acceptsYoutubeRequest({
    liveVideoId: "video-1", transport: "polling", maxResults: 500, pollingIntervalMs: 5000,
})
acceptsYoutubeRequest({
    liveChatId: "chat-1", transport: "streamList",
    includeHistory: true, includeRaw: true, maxRecentMessageIds: 2500,
})
acceptsMultiPlatformRequest({
    platform: "youtube", liveVideoId: "video-1", transport: "streamList",
})
acceptsMultiPlatformRequest({
    platform: "youtube", liveChatId: "chat-1", maxResults: 200,
})

// @ts-expect-error A listener must have a chat or video target.
acceptsYoutubeRequest({ transport: "streamList" })
// @ts-expect-error Supplying both targets would silently bypass video lookup.
acceptsYoutubeRequest({ liveChatId: "chat-1", liveVideoId: "video-1" })
// @ts-expect-error Polling page sizes are not supported by the streaming transport.
acceptsYoutubeRequest({ liveChatId: "chat-1", transport: "streamList", maxResults: 500 })
// @ts-expect-error A polling interval cannot configure a server-pushed stream.
acceptsYoutubeRequest({ liveChatId: "chat-1", transport: "streamList", pollingIntervalMs: 5000 })
// @ts-expect-error Caller-provided pagination is not exposed by this listener.
acceptsYoutubeRequest({ liveChatId: "chat-1", pageToken: "page-1" })
// @ts-expect-error Native localization options are not exposed by this listener.
acceptsYoutubeRequest({ liveChatId: "chat-1", transport: "streamList", hl: "en" })
// @ts-expect-error Local filtering options must be booleans.
acceptsYoutubeRequest({ liveChatId: "chat-1", includeHistory: "true" })
// @ts-expect-error The multi-platform surface preserves the same transport constraints.
acceptsMultiPlatformRequest({ platform: "youtube", liveChatId: "chat-1", transport: "streamList", maxResults: 500 })
// @ts-expect-error The multi-platform surface preserves the same target constraints.
acceptsMultiPlatformRequest({ platform: "youtube", liveChatId: "chat-1", liveVideoId: "video-1" })
