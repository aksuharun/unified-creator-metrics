import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformValidationError } from "../../src/errors.js"
import { createKickClient } from "../../src/providers/kick/index.js"

describe("createKickClient auth requirements", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("requires userAccessToken for chat.sendMessage()", async () => {
        const kick = createKickClient({
            appAccessToken: "kick-app-token",
        })

        await expect(
            kick.chat.sendMessage({
                type: "bot",
                text: "Hello Kick chat",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })

    it("requires appAccessToken for channels.resolve()", async () => {
        const kick = createKickClient({
            userAccessToken: "kick-user-token",
        })

        await expect(
            kick.channels.resolve({
                slug: "aksuharun",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
    })

    it("accepts the deprecated accessToken as a fallback", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    data: {
                        message_id: "kick-message-1",
                    },
                }),
                { status: 200 },
            ),
        )

        const kick = createKickClient({
            accessToken: "legacy-kick-token",
        })

        await kick.chat.sendMessage({
            type: "bot",
            text: "Hello Kick chat",
        })

        const [, init] = fetchMock.mock.calls[0]
        expect(init).toMatchObject({
            headers: {
                Authorization: "Bearer legacy-kick-token",
            },
        })
    })
})
