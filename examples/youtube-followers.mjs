import {
    PlatformValidationError,
    createMultiPlatformClient,
    createYoutubeClient,
} from "../dist/index.js"

async function main() {
    const youtubeClient = createYoutubeClient({
        apiKey: process.env.YOUTUBE_API_KEY,
    })

    const client = createMultiPlatformClient({
        youtube: youtubeClient,
    })

    const metrics = await client.channels.getMetrics({
        platform: "youtube",
        channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
        metrics: ["followers", "views"],
    })

    console.log(metrics)
}

try {
    await main()
} catch (error) {
    if (error instanceof PlatformValidationError) {
        console.error(`[${error.platform ?? "library"}] ${error.message}`)
        process.exitCode = 1
    } else {
        console.error("Unexpected error while fetching YouTube channel metrics.")
        console.error(error)
        process.exitCode = 1
    }
}
