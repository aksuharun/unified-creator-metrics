import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createKickChatClient } from "../../src/providers/kick/chat.js"

describe("createKickChatClient().listen", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("requires webhook.callbackUrl when subscription mode is ensure", () => {
        const chat = createKickChatClient({ accessToken: "kick-token" })

        expect(() => {
            chat.listen({
                broadcasterUserId: 123,
                subscription: "ensure",
            })
        }).toThrowError(PlatformValidationError)
    })

    it("rejects non-positive maxRecentMessageIds values", () => {
        const chat = createKickChatClient({ accessToken: "kick-token" })

        expect(() => {
            chat.listen({
                broadcasterUserId: 123,
                subscription: "create",
                maxRecentMessageIds: 0,
            })
        }).toThrowError(PlatformValidationError)
    })

    it("reuses an existing subscription when the callback URL matches", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "subscription-1",
                            event: "chat.message.sent",
                            version: 1,
                            method: "webhook",
                            broadcaster_user_id: 123,
                            callback_url: "https://example.com/kick/webhook",
                        },
                    ],
                }),
                { status: 200 },
            ),
        )

        const chat = createKickChatClient({ accessToken: "kick-token" }).listen({
            broadcasterUserId: 123,
            subscription: "ensure",
            webhook: {
                callbackUrl: "https://example.com/kick/webhook",
            },
        })
        const result = await chat.start()

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(String(fetchMock.mock.calls[0][0])).toContain(
            "broadcaster_user_id=123",
        )
        expect(result).toEqual({
            subscriptions: [
                {
                    id: "subscription-1",
                    event: "chat.message.sent",
                    version: 1,
                    method: "webhook",
                    broadcaster_user_id: 123,
                    callback_url: "https://example.com/kick/webhook",
                },
            ],
        })
    })

    it("creates a new subscription when the existing callback URL differs", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        data: [
                            {
                                id: "subscription-old",
                                event: "chat.message.sent",
                                version: 1,
                                method: "webhook",
                                broadcaster_user_id: 123,
                                callback_url: "https://old.example.com/kick/webhook",
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        data: [
                            {
                                name: "chat.message.sent",
                                version: 1,
                                subscription_id: "subscription-new",
                                callback_url: "https://new.example.com/kick/webhook",
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            )

        const chat = createKickChatClient({ accessToken: "kick-token" }).listen({
            broadcasterUserId: 123,
            subscription: "ensure",
            webhook: {
                callbackUrl: "https://new.example.com/kick/webhook",
            },
        })
        const result = await chat.start()

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock.mock.calls[1][1]).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer kick-token",
                "Content-Type": "application/json",
            },
        })
        expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
            broadcaster_user_id: 123,
            callback_url: "https://new.example.com/kick/webhook",
            events: [
                {
                    name: "chat.message.sent",
                    version: 1,
                },
            ],
            method: "webhook",
        })
        expect(result).toEqual({
            subscriptions: [
                {
                    id: "subscription-new",
                    event: "chat.message.sent",
                    version: 1,
                    method: "webhook",
                    broadcaster_user_id: 123,
                    callback_url: "https://new.example.com/kick/webhook",
                },
            ],
        })
    })

    it("rejects ambiguous reuse when Kick omits callback URLs on existing subscriptions", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            id: "subscription-1",
                            event: "chat.message.sent",
                            version: 1,
                            method: "webhook",
                            broadcaster_user_id: 123,
                        },
                    ],
                }),
                { status: 200 },
            ),
        )

        const chat = createKickChatClient({ accessToken: "kick-token" }).listen({
            broadcasterUserId: 123,
            subscription: "ensure",
            webhook: {
                callbackUrl: "https://example.com/kick/webhook",
            },
        })

        await expect(chat.start()).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "kick",
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
