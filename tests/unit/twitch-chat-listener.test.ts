import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createTwitchChatClient } from "../../src/providers/twitch/chat.js"

type FakeWebSocketEvent = {
    code?: number
    data?: string
    reason?: string
}

class FakeWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    static instances: FakeWebSocket[] = []

    readonly url: string
    readyState = FakeWebSocket.CONNECTING
    private readonly listeners = new Map<
        string,
        Set<(event: FakeWebSocketEvent) => void>
    >()

    constructor(url: string | URL) {
        this.url = String(url)
        FakeWebSocket.instances.push(this)
    }

    addEventListener(
        type: string,
        listener: (event: FakeWebSocketEvent) => void,
    ): void {
        const listeners = this.listeners.get(type) ?? new Set()
        listeners.add(listener)
        this.listeners.set(type, listeners)
    }

    close(code = 1000, reason = ""): void {
        if (this.readyState === FakeWebSocket.CLOSED) {
            return
        }

        this.readyState = FakeWebSocket.CLOSED
        this.dispatch("close", { code, reason })
    }

    open(): void {
        this.readyState = FakeWebSocket.OPEN
        this.dispatch("open", {})
    }

    message(payload: unknown): void {
        this.dispatch("message", { data: JSON.stringify(payload) })
    }

    private dispatch(type: string, event: FakeWebSocketEvent): void {
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event)
        }
    }
}

describe("createTwitchChatClient().listen", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
        vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket)
        FakeWebSocket.instances = []
    })

    it("starts a listener, creates the subscription, and emits normalized messages", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    client_id: "client-1",
                    login: "viewer",
                    scopes: ["user:read:chat"],
                    user_id: "user-1",
                }),
                { status: 200 },
            ),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "subscription-1",
                            status: "enabled",
                            type: "channel.chat.message",
                            version: "1",
                            cost: 0,
                            condition: {
                                broadcaster_user_id: "broadcaster-1",
                                user_id: "user-1",
                            },
                            transport: {
                                method: "websocket",
                                session_id: "session-1",
                            },
                            created_at: "2026-05-22T10:00:00.000Z",
                        },
                    ],
                }),
                { status: 202 },
            ),
        )

        const chat = createTwitchChatClient({
            clientId: "client-1",
            accessToken: "token-1",
        })
        const listener = chat.listen({
            broadcasterId: "broadcaster-1",
            includeRaw: true,
        })
        const messages = []

        listener.on("message", (message) => {
            messages.push(message)
        })

        const startPromise = listener.start()
        await settle()
        const socket = FakeWebSocket.instances[0]

        expect(socket.url).toBe("wss://eventsub.wss.twitch.tv/ws")

        socket.open()
        socket.message({
            metadata: {
                message_id: "welcome-1",
                message_type: "session_welcome",
                message_timestamp: "2026-05-22T10:00:00.000Z",
            },
            payload: {
                session: {
                    id: "session-1",
                    keepalive_timeout_seconds: 30,
                    reconnect_url: null,
                },
            },
        })

        await expect(startPromise).resolves.toEqual({
            broadcasterId: "broadcaster-1",
            sessionId: "session-1",
            userId: "user-1",
            subscriptions: [
                {
                    id: "subscription-1",
                    status: "enabled",
                    type: "channel.chat.message",
                    version: "1",
                    cost: 0,
                    condition: {
                        broadcasterUserId: "broadcaster-1",
                        userId: "user-1",
                    },
                    transport: {
                        method: "websocket",
                        sessionId: "session-1",
                    },
                    createdAt: "2026-05-22T10:00:00.000Z",
                },
            ],
        })

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://id.twitch.tv/oauth2/validate",
            {
                headers: {
                    Authorization: "OAuth token-1",
                },
            },
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            {
                method: "POST",
                body: JSON.stringify({
                    type: "channel.chat.message",
                    version: "1",
                    condition: {
                        broadcaster_user_id: "broadcaster-1",
                        user_id: "user-1",
                    },
                    transport: {
                        method: "websocket",
                        session_id: "session-1",
                    },
                }),
                headers: {
                    Authorization: "Bearer token-1",
                    "Client-Id": "client-1",
                    "Content-Type": "application/json",
                },
            },
        )

        socket.message({
            metadata: {
                message_id: "transport-message-1",
                message_type: "notification",
                message_timestamp: "2026-05-22T10:01:02.345678901Z",
                subscription_type: "channel.chat.message",
                subscription_version: "1",
            },
            payload: {
                subscription: {
                    id: "subscription-1",
                    type: "channel.chat.message",
                    version: "1",
                },
                event: {
                    broadcaster_user_id: "broadcaster-1",
                    broadcaster_user_login: "aksuharun",
                    broadcaster_user_name: "AksuHarun",
                    chatter_user_id: "viewer-1",
                    chatter_user_login: "viewer32",
                    chatter_user_name: "Viewer32",
                    message_id: "chat-message-1",
                    message: {
                        text: "Hi chat",
                        fragments: [{ text: "Hi chat" }],
                    },
                },
            },
        })
        socket.message({
            metadata: {
                message_id: "transport-message-1",
                message_type: "notification",
                message_timestamp: "2026-05-22T10:01:02.345678901Z",
                subscription_type: "channel.chat.message",
                subscription_version: "1",
            },
            payload: {
                event: {
                    broadcaster_user_id: "broadcaster-1",
                    chatter_user_id: "viewer-1",
                    message_id: "chat-message-1",
                    message: {
                        text: "Hi chat",
                    },
                },
            },
        })

        await settle()

        expect(messages).toEqual([
            {
                platform: "twitch",
                type: "message",
                id: "chat-message-1",
                text: "Hi chat",
                sentAt: "2026-05-22T10:01:02.345Z",
                author: {
                    id: "viewer-1",
                    username: "viewer32",
                    displayName: "Viewer32",
                },
                channel: {
                    id: "broadcaster-1",
                    slug: "aksuharun",
                    displayName: "AksuHarun",
                },
                raw: {
                    metadata: {
                        message_id: "transport-message-1",
                        message_type: "notification",
                        message_timestamp: "2026-05-22T10:01:02.345678901Z",
                        subscription_type: "channel.chat.message",
                        subscription_version: "1",
                    },
                    payload: {
                        subscription: {
                            id: "subscription-1",
                            type: "channel.chat.message",
                            version: "1",
                        },
                        event: {
                            broadcaster_user_id: "broadcaster-1",
                            broadcaster_user_login: "aksuharun",
                            broadcaster_user_name: "AksuHarun",
                            chatter_user_id: "viewer-1",
                            chatter_user_login: "viewer32",
                            chatter_user_name: "Viewer32",
                            message_id: "chat-message-1",
                            message: {
                                text: "Hi chat",
                                fragments: [{ text: "Hi chat" }],
                            },
                        },
                    },
                },
            },
        ])
    })

    it("rejects start when the token is missing the chat scope", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    client_id: "client-1",
                    scopes: [],
                    user_id: "user-1",
                }),
                { status: 200 },
            ),
        )

        const chat = createTwitchChatClient({
            clientId: "client-1",
            accessToken: "token-1",
        })

        await expect(
            chat.listen({
                broadcasterId: "broadcaster-1",
            }).start(),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(FakeWebSocket.instances).toHaveLength(0)
    })

    it("deletes created subscriptions when stopped with unsubscribe", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    client_id: "client-1",
                    scopes: ["user:read:chat"],
                    user_id: "user-1",
                }),
                { status: 200 },
            ),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "subscription-1",
                            status: "enabled",
                            type: "channel.chat.message",
                            version: "1",
                            cost: 0,
                            condition: {
                                broadcaster_user_id: "broadcaster-1",
                                user_id: "user-1",
                            },
                            transport: {
                                method: "websocket",
                                session_id: "session-1",
                            },
                            created_at: "2026-05-22T10:00:00.000Z",
                        },
                    ],
                }),
                { status: 202 },
            ),
        )
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

        const chat = createTwitchChatClient({
            clientId: "client-1",
            accessToken: "token-1",
        })
        const listener = chat.listen({
            broadcasterId: "broadcaster-1",
        })

        const startPromise = listener.start()
        await settle()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.message({
            metadata: {
                message_id: "welcome-1",
                message_type: "session_welcome",
                message_timestamp: "2026-05-22T10:00:00.000Z",
            },
            payload: {
                session: {
                    id: "session-1",
                    keepalive_timeout_seconds: 30,
                    reconnect_url: null,
                },
            },
        })
        await startPromise

        await listener.stop({ unsubscribe: true })

        const [url, init] = fetchMock.mock.calls[2]

        expect(String(url)).toBe(
            "https://api.twitch.tv/helix/eventsub/subscriptions?id=subscription-1",
        )
        expect(init).toEqual({
            method: "DELETE",
            headers: {
                Authorization: "Bearer token-1",
                "Client-Id": "client-1",
                "Content-Type": "application/json",
            },
        })
        expect(socket.readyState).toBe(FakeWebSocket.CLOSED)
    })

    it("follows Twitch's server-requested reconnect flow without recreating the subscription", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    client_id: "client-1",
                    scopes: ["user:read:chat"],
                    user_id: "user-1",
                }),
                { status: 200 },
            ),
        )
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "subscription-1",
                            status: "enabled",
                            type: "channel.chat.message",
                            version: "1",
                            cost: 0,
                            condition: {
                                broadcaster_user_id: "broadcaster-1",
                                user_id: "user-1",
                            },
                            transport: {
                                method: "websocket",
                                session_id: "session-1",
                            },
                            created_at: "2026-05-22T10:00:00.000Z",
                        },
                    ],
                }),
                { status: 202 },
            ),
        )

        const chat = createTwitchChatClient({
            clientId: "client-1",
            accessToken: "token-1",
        })
        const listener = chat.listen({
            broadcasterId: "broadcaster-1",
        })
        const messages = []

        listener.on("message", (message) => {
            messages.push(message)
        })

        const startPromise = listener.start()
        await settle()
        const firstSocket = FakeWebSocket.instances[0]
        firstSocket.open()
        firstSocket.message({
            metadata: {
                message_id: "welcome-1",
                message_type: "session_welcome",
                message_timestamp: "2026-05-22T10:00:00.000Z",
            },
            payload: {
                session: {
                    id: "session-1",
                    keepalive_timeout_seconds: 30,
                    reconnect_url: null,
                },
            },
        })
        await startPromise

        firstSocket.message({
            metadata: {
                message_id: "reconnect-1",
                message_type: "session_reconnect",
                message_timestamp: "2026-05-22T10:02:00.000Z",
            },
            payload: {
                session: {
                    id: "session-1",
                    reconnect_url: "wss://eventsub.wss.twitch.tv/ws?reconnect=1",
                },
            },
        })

        const secondSocket = FakeWebSocket.instances[1]
        secondSocket.open()
        secondSocket.message({
            metadata: {
                message_id: "welcome-2",
                message_type: "session_welcome",
                message_timestamp: "2026-05-22T10:02:01.000Z",
            },
            payload: {
                session: {
                    id: "session-2",
                    keepalive_timeout_seconds: 30,
                    reconnect_url: null,
                },
            },
        })

        await settle()

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(firstSocket.readyState).toBe(FakeWebSocket.CLOSED)

        secondSocket.message({
            metadata: {
                message_id: "transport-message-2",
                message_type: "notification",
                message_timestamp: "2026-05-22T10:02:02.000Z",
                subscription_type: "channel.chat.message",
                subscription_version: "1",
            },
            payload: {
                event: {
                    broadcaster_user_id: "broadcaster-1",
                    broadcaster_user_login: "aksuharun",
                    broadcaster_user_name: "AksuHarun",
                    chatter_user_id: "viewer-2",
                    chatter_user_login: "viewer64",
                    chatter_user_name: "Viewer64",
                    message_id: "chat-message-2",
                    message: {
                        fragments: [{ text: "Reconnect worked" }],
                    },
                },
            },
        })
        await settle()

        expect(messages).toHaveLength(1)
        expect(messages[0]).toMatchObject({
            id: "chat-message-2",
            text: "Reconnect worked",
        })
    })
})

async function settle(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
    await new Promise((resolve) => {
        setTimeout(resolve, 0)
    })
}
