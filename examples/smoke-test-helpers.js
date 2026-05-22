import {
    PlatformApiError,
    PlatformValidationError,
    createGoogleYoutubeClient,
} from "@multi-platform-api/library"

/* global fetch, URLSearchParams */

const DEFAULT_MESSAGE_PREFIX = "Smoke test from multi-platform-api-library"

export function requiredEnv(name) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`${name} is required.`)
    }

    return value
}

export function optionalEnv(name, fallback) {
    return process.env[name] || fallback
}

export function positiveIntegerEnv(name) {
    const value = Number(requiredEnv(name))

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer.`)
    }

    return value
}

export function getSmokeMessage(envName) {
    return (
        process.env[envName] ||
        `${DEFAULT_MESSAGE_PREFIX} at ${new Date().toISOString()}`
    )
}

export function getKickUserAccessToken() {
    return requiredEnv("KICK_USER_ACCESS_TOKEN")
}

export async function getKickAppAccessToken() {
    if (process.env.KICK_APP_ACCESS_TOKEN) {
        return process.env.KICK_APP_ACCESS_TOKEN
    }

    const clientId = requiredEnv("KICK_CLIENT_ID")
    const clientSecret = requiredEnv("KICK_CLIENT_SECRET")
    const response = await fetch("https://id.kick.com/oauth/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials",
        }),
    })

    if (!response.ok) {
        throw new Error(`Kick token request failed with ${response.status}.`)
    }

    const payload = await response.json()

    if (!payload.access_token) {
        throw new Error("Kick token response did not include an access token.")
    }

    return payload.access_token
}

export async function resolveYoutubeLiveChatId(options) {
    if (process.env.YOUTUBE_LIVE_CHAT_ID) {
        return process.env.YOUTUBE_LIVE_CHAT_ID
    }

    const liveVideoId = requiredEnv("YOUTUBE_LIVE_VIDEO_ID")
    const youtube = createGoogleYoutubeClient(options)
    const response = await youtube.videos.list({
        part: ["liveStreamingDetails"],
        id: [liveVideoId],
    })
    const liveChatId =
        response.data.items?.[0]?.liveStreamingDetails?.activeLiveChatId

    if (!liveChatId) {
        throw new Error(
            `Could not resolve active liveChatId for video "${liveVideoId}".`,
        )
    }

    return liveChatId
}

export function handleSmokeTestError(label, error) {
    console.error(`${label} smoke test failed.`)

    if (
        error instanceof PlatformApiError ||
        error instanceof PlatformValidationError
    ) {
        console.error(`[${error.platform ?? "library"}] ${error.message}`)

        if ("status" in error && error.status) {
            console.error(`HTTP status: ${error.status}`)
        }
    } else {
        console.error(error)
    }

    process.exitCode = 1
}
