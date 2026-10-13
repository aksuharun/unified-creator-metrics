import { describe, expect, it, vi } from "vitest"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import { ChatListenerEmitter } from "../../src/chat-listener.js"
import { PlatformValidationError } from "../../src/errors.js"
import { createYoutubeClient } from "../../src/providers/youtube/index.js"
import type { MultiPlatformYoutubeChatListenRequest } from "../../src/multi-platform.js"
import type { ChatMessage } from "../../src/types.js"
import type {
    ChatMessage as YoutubeChatMessage,
    YoutubeChatStartResult,
    YoutubeClient,
} from "../../src/providers/youtube/types.js"
import type {
    ChatMessage as TwitchChatMessage,
    TwitchChatListener,
    TwitchChatStartResult,
    TwitchClient,
} from "../../src/providers/twitch/types.js"

class FakeTwitchChatListener
    extends ChatListenerEmitter<TwitchChatMessage, TwitchChatStartResult>
    implements TwitchChatListener {
    readonly stop = vi.fn(async () => {})

    async start(): Promise<TwitchChatStartResult> {
        return {
            broadcasterId: "broadcaster-1",
            sessionId: "session-1",
            userId: "user-1",
            subscriptions: [],
        }
    }

    emitMessage(message: TwitchChatMessage): void {
        super.emitMessage(message)
    }
}

describe("createMultiPlatformClient().chats.listen", () => {
    it("forwards the YouTube streamList transport and listener options", async () => {
        const listener = new ChatListenerEmitter<YoutubeChatMessage, YoutubeChatStartResult>()
        vi.spyOn(listener, "start").mockResolvedValue({ liveChatId: "chat-1", liveVideoId: null })
        const listen = vi.fn().mockReturnValue(listener)
        const youtube = {
            platform: "youtube",
            chat: { listen },
        } as unknown as YoutubeClient
        const client = createMultiPlatformClient({ youtube })
        const chat = client.chats.listen({
            platform: "youtube",
            liveChatId: "chat-1",
            transport: "streamList",
            includeHistory: true,
            includeRaw: true,
            maxRecentMessageIds: 2500,
        })

        await expect(chat.start()).resolves.toEqual([
            { platform: "youtube", liveChatId: "chat-1", liveVideoId: null },
        ])
        expect(listen).toHaveBeenCalledWith({
            liveChatId: "chat-1",
            transport: "streamList",
            includeHistory: true,
            includeRaw: true,
            maxRecentMessageIds: 2500,
        })
        await chat.stop()
    })

    it.each([
        { maxResults: 500 },
        { pollingIntervalMs: 5000 },
        { pageToken: "page-1" },
        { includeHistory: "true" },
        { liveVideoId: "video-1" },
    ])("does not silently discard invalid YouTube options %j", (options) => {
        const youtube = createYoutubeClient({ apiKey: "unused-test-key" })
        const client = createMultiPlatformClient({ youtube })
        const request = {
            platform: "youtube", liveChatId: "chat-1", transport: "streamList", ...options,
        }
        expect(() => client.chats.listen(request as unknown as MultiPlatformYoutubeChatListenRequest))
            .toThrow(PlatformValidationError)
    })

    it("routes Twitch listeners and forwards their events", async () => {
        const listener = new FakeTwitchChatListener()
        const listen = vi.fn().mockReturnValue(listener)
        const twitch = {
            platform: "twitch",
            chat: {
                listen,
            },
        } as unknown as TwitchClient
        const client = createMultiPlatformClient({ twitch })
        const chat = client.chats.listen({
            platform: "twitch",
            broadcasterId: "broadcaster-1",
            includeRaw: true,
            maxRecentMessageIds: 2500,
            keepaliveTimeoutSeconds: 30,
        })
        const messages: ChatMessage[] = []

        chat.on("message", (message) => {
            messages.push(message)
        })

        const startResult = await chat.start()

        expect(listen).toHaveBeenCalledWith({
            broadcasterId: "broadcaster-1",
            includeRaw: true,
            maxRecentMessageIds: 2500,
            websocketUrl: undefined,
            keepaliveTimeoutSeconds: 30,
        })
        expect(startResult).toEqual([
            {
                platform: "twitch",
                broadcasterId: "broadcaster-1",
                sessionId: "session-1",
                userId: "user-1",
                subscriptions: [],
            },
        ])

        listener.emitMessage({
            platform: "twitch",
            type: "message",
            id: "chat-message-1",
            text: "Hello Twitch chat",
            sentAt: "2026-05-22T10:00:00.000Z",
            author: {
                id: "viewer-1",
                username: "viewer1",
                displayName: "Viewer1",
            },
            channel: {
                id: "broadcaster-1",
                slug: "aksuharun",
                displayName: "AksuHarun",
            },
        })

        expect(messages).toEqual([
            {
                platform: "twitch",
                type: "message",
                id: "chat-message-1",
                text: "Hello Twitch chat",
                sentAt: "2026-05-22T10:00:00.000Z",
                author: {
                    id: "viewer-1",
                    username: "viewer1",
                    displayName: "Viewer1",
                },
                channel: {
                    id: "broadcaster-1",
                    slug: "aksuharun",
                    displayName: "AksuHarun",
                },
            },
        ])

        await chat.stop({
            twitch: {
                unsubscribe: true,
            },
        })

        expect(listener.stop).toHaveBeenCalledWith({
            unsubscribe: true,
        })
    })
})
