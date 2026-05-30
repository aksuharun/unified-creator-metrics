import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        clientSecret: requiredEnv("TWITCH_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("TWITCH_REFRESH_TOKEN"),
    })

    const channelId = optionalEnv("TWITCH_CHANNEL_ID", "12826") // Twitch user_id for Ninja or twitchdev

    console.log("Fetching Twitch active streams for channel:", channelId)
    const active = await twitch.livestreams.getActive({
        channelId,
    })
    console.log("Active streams:", active)

    console.log("Fetching Twitch scheduled streams for channel:", channelId)
    const scheduled = await twitch.livestreams.getScheduled({
        channelId,
    })
    console.log("Scheduled streams:", scheduled)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Twitch livestreams", error)
}
