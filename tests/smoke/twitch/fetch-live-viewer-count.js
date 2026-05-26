import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    requiredEnv,
    resolveTwitchBroadcasterId,
} from "../helpers.js"

async function main() {
    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        clientSecret: requiredEnv("TWITCH_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("TWITCH_REFRESH_TOKEN"),
    })
    const broadcasterId = await resolveTwitchBroadcasterId()
    const metrics = await twitch.videos.getMetrics({
        videoId: broadcasterId,
        metrics: ["concurrentViewers"],
    })

    console.log(metrics)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Twitch concurrent viewers", error)
}
