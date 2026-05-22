import "dotenv/config"
import {
    createKickClient,
    createMultiPlatformClient,
    createYoutubeClient,
} from "@multi-platform-api/library"
import {
    getKickAppAccessToken,
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../smoke-test-helpers.mjs"

async function main() {
    const kick = createKickClient({
        accessToken: await getKickAppAccessToken(),
    })
    const youtube = createYoutubeClient({
        apiKey: requiredEnv("YOUTUBE_API_KEY"),
    })
    const client = createMultiPlatformClient({
        kick,
        youtube,
    })
    const metrics = await client.videos.getMetrics([
        {
            platform: "kick",
            videoId: optionalEnv("KICK_CHANNEL_SLUG", "aksuharun"),
            metrics: ["concurrentViewers"],
        },
        {
            platform: "youtube",
            videoId: optionalEnv("YOUTUBE_VIDEO_ID", "rNahMr4Eppk"),
            metrics: ["likes", "views", "concurrentViewers"],
        },
    ])

    console.log(metrics)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Multi-platform video metrics", error)
}
