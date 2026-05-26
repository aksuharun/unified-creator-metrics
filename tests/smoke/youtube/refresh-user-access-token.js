import "dotenv/config"
import {
    createYoutubeClient,
    refreshYoutubeAccessToken,
} from "unified-creator-metrics"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const clientId = requiredEnv("YOUTUBE_CLIENT_ID")
    const clientSecret = requiredEnv("YOUTUBE_CLIENT_SECRET")
    const refreshToken = requiredEnv("YOUTUBE_REFRESH_TOKEN")

    console.log("Refreshing YouTube access token...")

    const refreshedTokens = await refreshYoutubeAccessToken({
        clientId,
        clientSecret,
        refreshToken,
    })

    console.log("YouTube token refresh succeeded.")
    console.log("YOUTUBE_REFRESHED_EXPIRES_IN:", refreshedTokens.expiresIn)

    let tokenUpdateCount = 0
    const youtube = createYoutubeClient({
        clientId,
        clientSecret,
        refreshToken,
        onTokenUpdate() {
            tokenUpdateCount += 1
        },
    })

    const channelId = optionalEnv(
        "YOUTUBE_CHANNEL_ID",
        "UCGy9vOmYGW7quWUxJMQbvUg",
    )

    console.log("Fetching YouTube channel metrics with refresh-token auth...")
    console.log("YOUTUBE_CHANNEL_ID:", channelId)

    const metrics = await youtube.channels.getMetrics({
        channelId,
        metrics: ["followers", "views"],
    })

    console.dir(metrics, { depth: null })

    if (!metrics.channelId) {
        throw new Error(
            "YouTube refresh-user-access-token smoke test did not return channelId.",
        )
    }

    console.log("YOUTUBE_TOKEN_UPDATE_COUNT:", tokenUpdateCount)
}

main().catch((error) => {
    handleSmokeTestError("YouTube refresh user access token", error)
})
