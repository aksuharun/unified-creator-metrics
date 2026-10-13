import "dotenv/config"
import {
    createMultiPlatformClient,
    createYoutubeClient,
} from "unified-creator-metrics"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const youtube = createYoutubeClient({
        apiKey: requiredEnv("YOUTUBE_API_KEY"),
    })
    const client = createMultiPlatformClient({
        youtube,
    })
    const metrics = await client.channels.getMetrics({
        platform: "youtube",
        channelId: optionalEnv(
            "YOUTUBE_CHANNEL_ID",
            "UCGy9vOmYGW7quWUxJMQbvUg",
        ),
        metrics: ["followers", "views"],
    })

    console.log(metrics)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Multi-platform channel metrics", error)
}
