import { createYoutubeClient } from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const youtube = createYoutubeClient({
        apiKey: requiredEnv("YOUTUBE_API_KEY"),
    })
    const metrics = await youtube.videos.getMetrics({
        videoId: optionalEnv("YOUTUBE_VIDEO_ID", "rNahMr4Eppk"),
        metrics: ["likes", "views", "concurrentViewers"],
    })

    console.log(metrics)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("YouTube video metrics", error)
}
