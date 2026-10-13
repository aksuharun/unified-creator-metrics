import "dotenv/config"
import {
    createKickClient,
    createMultiPlatformClient,
    createTwitchClient,
    createYoutubeClient,
} from "unified-creator-metrics"
import {
    getKickAppAccessToken,
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
    resolveTwitchBroadcasterId,
} from "../helpers.js"

async function main() {
    const kick = createKickClient({
        appAccessToken: await getKickAppAccessToken(),
    })
    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        clientSecret: requiredEnv("TWITCH_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("TWITCH_REFRESH_TOKEN"),
    })
    const youtube = createYoutubeClient({
        apiKey: requiredEnv("YOUTUBE_API_KEY"),
    })
    const client = createMultiPlatformClient({
        kick,
        twitch,
        youtube,
    })
    const twitchBroadcasterId = await resolveTwitchBroadcasterId()
    const metrics = await client.videos.getMetrics([
        {
            platform: "kick",
            videoId: optionalEnv("KICK_CHANNEL_SLUG", "aksuharun"),
            metrics: ["concurrentViewers"],
        },
        {
            platform: "twitch",
            videoId: twitchBroadcasterId,
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
