import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformApiError, PlatformValidationError } from "../../src/errors.js"
import { createKickChannelsClient } from "../../src/providers/kick/channels.js"

describe("createKickChannelsClient().resolve", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("resolves a Kick broadcaster id from a channel slug", async () => {
        const responsePayload = {
            data: [
                {
                    broadcaster_user_id: 123,
                    slug: "aksuharun",
                    profile_picture: "https://kick.com/avatar.png",
                },
            ],
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const channels = createKickChannelsClient({ appAccessToken: "kick-token" })
        const result = await channels.resolve({
            slug: "AksuHarun",
            includeRaw: true,
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe(
            "https://api.kick.com/public/v1/channels?slug=aksuharun",
        )
        expect(init).toMatchObject({
            headers: {
                Authorization: "Bearer kick-token",
            },
        })
        expect(result).toEqual({
            platform: "kick",
            broadcasterUserId: 123,
            slug: "aksuharun",
            displayName: "aksuharun",
            profilePictureUrl: "https://kick.com/avatar.png",
            fetchedAt: expect.any(String),
            raw: responsePayload,
        })
    })

    it("rejects blank slugs before calling the API", async () => {
        const fetchMock = vi.mocked(fetch)
        const channels = createKickChannelsClient({ appAccessToken: "kick-token" })

        await expect(
            channels.resolve({
                slug: "   ",
            }),
        ).rejects.toBeInstanceOf(PlatformValidationError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("wraps Kick API failures with platform context", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
        )
        const channels = createKickChannelsClient({ appAccessToken: "kick-token" })

        await expect(
            channels.resolve({
                slug: "aksuharun",
            }),
        ).rejects.toMatchObject<Partial<PlatformApiError>>({
            name: "PlatformApiError",
            platform: "kick",
            status: 403,
        })
    })
})

describe("createKickChannelsClient().getAuthenticatedUser", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("resolves the authenticated Kick user", async () => {
        const responsePayload = {
            data: {
                id: 456,
                username: "auth_kick_user",
                profile_picture: "https://kick.com/auth-avatar.png",
            },
        }
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(responsePayload), { status: 200 }),
        )

        const userAccessTokenProvider = {
            canRefresh: false,
            getAccessToken: vi.fn().mockResolvedValue("kick-user-token"),
            refreshAccessToken: vi.fn(),
        }

        const channels = createKickChannelsClient({
            userAccessTokenProvider,
        })
        const result = await channels.getAuthenticatedUser()

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe("https://api.kick.com/public/v1/users")
        expect(init).toMatchObject({
            headers: {
                Authorization: "Bearer kick-user-token",
            },
        })
        expect(result).toEqual({
            platform: "kick",
            broadcasterUserId: 456,
            slug: "auth_kick_user",
            displayName: "auth_kick_user",
            profilePictureUrl: "https://kick.com/auth-avatar.png",
            fetchedAt: expect.any(String),
        })
    })

    it("throws PlatformValidationError when userAccessTokenProvider is missing", async () => {
        const channels = createKickChannelsClient({
            appAccessToken: "kick-app-token",
        })

        await expect(channels.getAuthenticatedUser()).rejects.toBeInstanceOf(PlatformValidationError)
    })
})
