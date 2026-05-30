import "dotenv/config"
import {
    createMultiPlatformClient,
    createYoutubeClient,
    createTwitchClient,
    createKickClient,
} from "unified-creator-metrics"
import {
    handleSmokeTestError,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const youtube = createYoutubeClient({
        clientId: requiredEnv("YOUTUBE_CLIENT_ID"),
        clientSecret: requiredEnv("YOUTUBE_CLIENT_SECRET"),
        refreshToken: requiredEnv("YOUTUBE_REFRESH_TOKEN"),
    })

    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        clientSecret: requiredEnv("TWITCH_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("TWITCH_REFRESH_TOKEN"),
    })

    const kick = createKickClient({
        clientId: requiredEnv("KICK_CLIENT_ID"),
        clientSecret: requiredEnv("KICK_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("KICK_REFRESH_TOKEN"),
    })

    const client = createMultiPlatformClient({
        youtube,
        twitch,
        kick,
    })

    console.log("Fetching YouTube authenticated user via MultiPlatformClient...")
    const youtubeUser = await client.channels.getAuthenticatedUser({ platform: "youtube" })
    console.dir(youtubeUser, { depth: null })

    console.log("\nFetching Twitch authenticated user via MultiPlatformClient...")
    const twitchUser = await client.channels.getAuthenticatedUser({ platform: "twitch" })
    console.dir(twitchUser, { depth: null })

    console.log("\nFetching Kick authenticated user via MultiPlatformClient...")
    const kickUser = await client.channels.getAuthenticatedUser({ platform: "kick" })
    console.dir(kickUser, { depth: null })
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Multi-platform get authenticated user", error)
}
