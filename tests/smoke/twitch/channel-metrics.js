import "dotenv/config"
import { createTwitchClient } from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        accessToken: requiredEnv("TWITCH_USER_ACCESS_TOKEN"),
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
