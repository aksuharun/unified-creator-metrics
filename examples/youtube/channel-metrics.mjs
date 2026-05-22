import {
    createYoutubeClient,
} from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../smoke-test-helpers.mjs"

async function main() {
    const youtube = createYoutubeClient({
        apiKey: requiredEnv("YOUTUBE_API_KEY"),
    })
    const metrics = await youtube.channels.getMetrics({
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
    handleSmokeTestError("YouTube channel metrics", error)
}
