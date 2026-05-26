import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    createGoogleYoutubeAuthClient,
    refreshYoutubeAccessToken,
} from "../../src/youtube.js"

describe("YouTube refresh-token auth", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal("fetch", vi.fn())
    })

    it("refreshes a YouTube access token from a Google refresh token", async () => {
        const fetchMock = vi.mocked(fetch)
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    access_token: "youtube-access-token-2",
                    expires_in: 3600,
                    scope: "https://www.googleapis.com/auth/youtube",
                    token_type: "Bearer",
                }),
                { status: 200 },
            ),
        )

        const result = await refreshYoutubeAccessToken({
            clientId: "google-client-id",
            clientSecret: "google-client-secret",
            refreshToken: "google-refresh-token",
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]

        expect(String(url)).toBe("https://oauth2.googleapis.com/token")
        expect(init).toMatchObject({
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })

        const body = new URLSearchParams(String(init?.body))
        expect(body.get("client_id")).toBe("google-client-id")
        expect(body.get("client_secret")).toBe("google-client-secret")
        expect(body.get("grant_type")).toBe("refresh_token")
        expect(body.get("refresh_token")).toBe("google-refresh-token")

        expect(result).toEqual({
            accessToken: "youtube-access-token-2",
            refreshToken: "google-refresh-token",
            expiresIn: 3600,
            expiresAt: expect.any(String),
            scope: "https://www.googleapis.com/auth/youtube",
            tokenType: "Bearer",
        })
    })

    it("creates a Google OAuth client from a refresh token config", () => {
        const authClient = createGoogleYoutubeAuthClient({
            clientId: "google-client-id",
            clientSecret: "google-client-secret",
            refreshToken: "google-refresh-token",
            accessToken: "youtube-access-token-1",
        })

        expect(authClient).toBeTruthy()
        expect(
            "credentials" in (authClient as object)
                ? (authClient as { credentials?: unknown }).credentials
                : undefined,
        ).toMatchObject({
            access_token: "youtube-access-token-1",
            refresh_token: "google-refresh-token",
        })
    })
})
