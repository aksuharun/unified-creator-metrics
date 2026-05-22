import { describe, expect, it, vi } from "vitest"
import { createMultiPlatformClient } from "../../src/multi-platform.js"
import type {
    TwitchChatListener,
    TwitchClient,
} from "../../src/providers/twitch/types.js"

class FakeTwitchChatListener implements TwitchChatListener {
    private readonly messageHandlers = new Set<(message: unknown) => void>()
    private readonly errorHandlers = new Set<(error: unknown) => void>()
    readonly stop = vi.fn(async () => {})

    on(
        event: "message",
        handler: (message: unknown) => void,
    ): this
    on(event: "error", handler: (error: unknown) => void): this
    on(
        event: "message" | "error",
        handler: ((message: unknown) => void) | ((error: unknown) => void),
    ): this {
        if (event === "message") {
            this.messageHandlers.add(handler as (message: unknown) => void)
        } else {
            this.errorHandlers.add(handler as (error: unknown) => void)
        }

        return this
    }

    off(
        event: "message",
        handler: (message: unknown) => void,
    ): this
    off(event: "error", handler: (error: unknown) => void): this
    off(
        event: "message" | "error",
        handler: ((message: unknown) => void) | ((error: unknown) => void),
    ): this {
        if (event === "message") {
            this.messageHandlers.delete(handler as (message: unknown) => void)
        } else {
            this.errorHandlers.delete(handler as (error: unknown) => void)
        }

        return this
    }

    async start() {
        return {
            broadcasterId: "broadcaster-1",
            sessionId: "session-1",
            userId: "user-1",
            subscriptions: [],
        }
    }

    emitMessage(message: unknown): void {
        for (const handler of this.messageHandlers) {
            handler(message)
        }
    }
}

describe("createMultiPlatformClient().chats.listen", () => {
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
        const messages = []

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
