import "dotenv/config"
import { createTwitchClient } from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../smoke-test-helpers.js"

/* global fetch, URL */

const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix"

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const accessToken = requiredEnv("TWITCH_APP_ACCESS_TOKEN")
    const twitch = createTwitchClient({
        clientId,
        accessToken,
    })
    const login = optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun")
    let broadcasterId = process.env.TWITCH_BROADCASTER_ID

    if (!broadcasterId) {
        console.log("Resolving Twitch broadcaster identity...")
        console.log("TWITCH_BROADCASTER_LOGIN:", login)

        const identity = await twitch.channels.resolve({
            login,
        })

        broadcasterId = identity.broadcasterId
    }

    console.log("Fetching Twitch concurrent viewers...")
    console.log("TWITCH_BROADCASTER_ID:", broadcasterId)

    const payload = await fetchStreamByUserId({
        clientId,
        accessToken,
        broadcasterId,
    })
    const stream = payload.data?.[0]

    if (!stream) {
        console.log({
            platform: "twitch",
            broadcasterId,
            login,
            displayName: null,
            streamId: null,
            title: null,
            concurrentViewers: null,
            startedAt: null,
            fetchedAt: new Date().toISOString(),
        })
        return
    }

    console.log({
        platform: "twitch",
        broadcasterId: stream.user_id ?? broadcasterId,
        login: stream.user_login ?? login,
        displayName: stream.user_name ?? null,
        streamId: stream.id ?? null,
        title: stream.title ?? null,
        concurrentViewers:
            typeof stream.viewer_count === "number" ? stream.viewer_count : null,
        startedAt: stream.started_at ?? null,
        fetchedAt: new Date().toISOString(),
    })
}

async function fetchStreamByUserId({ clientId, accessToken, broadcasterId }) {
    const url = new URL(`${TWITCH_API_BASE_URL}/streams`)
    url.searchParams.set("user_id", broadcasterId)

    let response

    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Client-Id": clientId,
            },
        })
    } catch (error) {
        throw new Error("Twitch streams request failed.", {
            cause: error,
        })
    }

    const text = await response.text()
    let payload = null

    if (text) {
        try {
            payload = JSON.parse(text)
        } catch (error) {
            throw new Error("Twitch streams response was not valid JSON.", {
                cause: error,
            })
        }
    }

    if (!response.ok) {
        const message =
            payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
                ? payload.message
                : `HTTP ${response.status}`

        throw new Error(`Twitch streams request failed: ${message}`)
    }

    return payload ?? {}
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Twitch concurrent viewers", error)
}
