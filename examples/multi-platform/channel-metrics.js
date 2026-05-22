import "dotenv/config"
import {
    createMultiPlatformClient,
    createYoutubeClient,
} from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../smoke-test-helpers.js"

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
