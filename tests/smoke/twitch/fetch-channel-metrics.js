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
    const userRefreshToken = requiredEnv("TWITCH_REFRESH_TOKEN")
    const twitch = createTwitchClient({
        clientId,
        clientSecret,
        userRefreshToken,
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

    console.log("Fetching Twitch channel metrics...")
    console.log("TWITCH_BROADCASTER_ID:", broadcasterId)

    const metrics = await twitch.channels.getMetrics({
        channelId: broadcasterId,
        metrics: ["followers"],
    })

    console.dir(metrics, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("Twitch channel metrics", error)
})
