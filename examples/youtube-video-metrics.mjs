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

    const metrics = await client.videos.getMetrics({
        platform: "youtube",
        videoId: "rNahMr4Eppk",
        metrics: ["likes", "views", "concurrentViewers"],
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
        console.error("Unexpected error while fetching YouTube video metrics.")
        console.error(error)
        process.exitCode = 1
    }
}
