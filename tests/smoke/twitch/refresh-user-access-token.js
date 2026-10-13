import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const clientSecret = requiredEnv("TWITCH_CLIENT_SECRET")
    const refreshToken = requiredEnv("TWITCH_REFRESH_TOKEN")
    const login = optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun")
    let tokenUpdate

    const twitch = createTwitchClient({
        clientId,
        clientSecret,
        userRefreshToken: refreshToken,
        onUserTokenUpdate(tokens) {
            tokenUpdate = tokens
        },
    })

    console.log("Resolving Twitch broadcaster identity with refresh-token auth...")
    console.log("TWITCH_BROADCASTER_LOGIN:", login)

    const identity = await twitch.channels.resolve({
        login,
    })

    console.log("Fetching Twitch channel metrics with refresh-token auth...")
    console.log("TWITCH_BROADCASTER_ID:", identity.broadcasterId)

    const metrics = await twitch.channels.getMetrics({
        channelId: identity.broadcasterId,
        metrics: ["followers"],
    })

    console.dir(metrics, { depth: null })

    if (!tokenUpdate?.accessToken) {
        throw new Error(
            "Twitch refresh-user-access-token smoke test did not observe onUserTokenUpdate().",
        )
    }

    console.log("TWITCH_TOKEN_REFRESHED:", true)
    console.log("TWITCH_REFRESHED_EXPIRES_IN:", tokenUpdate.expiresIn)
}

main().catch((error) => {
    handleSmokeTestError("Twitch refresh user access token", error)
})
