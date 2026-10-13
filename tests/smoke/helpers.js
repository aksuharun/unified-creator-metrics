import {
    createKickClient,
    PlatformApiError,
    PlatformValidationError,
    createTwitchClient,
    createYoutubeClient,
    createGoogleYoutubeClient,
    refreshTwitchAccessToken,
} from "unified-creator-metrics"

/* global fetch, URLSearchParams */

const DEFAULT_MESSAGE_PREFIX = "Smoke test from Unified Creator Metrics"

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

export function getYoutubeClientConfigFromEnv() {
    return {
        apiKey: process.env.YOUTUBE_API_KEY,
        clientId: requiredEnv("YOUTUBE_CLIENT_ID"),
        clientSecret: requiredEnv("YOUTUBE_CLIENT_SECRET"),
        refreshToken: requiredEnv("YOUTUBE_REFRESH_TOKEN"),
    }
}

export function hasYoutubeRefreshTokenConfig() {
    return Boolean(
        process.env.YOUTUBE_CLIENT_ID &&
            process.env.YOUTUBE_CLIENT_SECRET &&
            process.env.YOUTUBE_REFRESH_TOKEN,
    )
}

export function createYoutubeClientFromEnv() {
    return createYoutubeClient(getYoutubeClientConfigFromEnv())
}

export function getKickUserAccessToken() {
    return requiredEnv("KICK_USER_ACCESS_TOKEN")
}

export async function resolveKickBroadcasterUserId() {
    if (process.env.KICK_BROADCASTER_USER_ID) {
        return positiveIntegerEnv("KICK_BROADCASTER_USER_ID")
    }

    const kick = createKickClient({
        appAccessToken: await getKickAppAccessToken(),
    })
    const slug = optionalEnv(
        "KICK_CHANNEL_SLUG",
        optionalEnv("KICK_BROADCASTER_USERNAME", "aksuharun"),
    )
    const identity = await kick.channels.resolve({
        slug,
    })

    return identity.broadcasterUserId
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

export async function getTwitchUserAccessToken() {
    if (process.env.TWITCH_USER_ACCESS_TOKEN) {
        return process.env.TWITCH_USER_ACCESS_TOKEN
    }

    const refreshedTokens = await refreshTwitchAccessToken({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        clientSecret: requiredEnv("TWITCH_CLIENT_SECRET"),
        refreshToken: requiredEnv("TWITCH_REFRESH_TOKEN"),
    })

    return refreshedTokens.accessToken
}

export async function resolveTwitchBroadcasterId() {
    if (process.env.TWITCH_BROADCASTER_ID) {
        return requiredEnv("TWITCH_BROADCASTER_ID")
    }

    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        clientSecret: requiredEnv("TWITCH_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("TWITCH_REFRESH_TOKEN"),
    })
    const identity = await twitch.channels.resolve({
        login: optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun"),
    })

    return identity.broadcasterId
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
