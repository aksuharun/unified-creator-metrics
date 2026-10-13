import "dotenv/config"
import { createYoutubeClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const clientId = requiredEnv("YOUTUBE_CLIENT_ID")
    const clientSecret = requiredEnv("YOUTUBE_CLIENT_SECRET")
    const refreshToken = requiredEnv("YOUTUBE_REFRESH_TOKEN")
    const youtube = createYoutubeClient({
        clientId,
        clientSecret,
        refreshToken,
    })

    console.log("Fetching YouTube authenticated user identity...")

    const identity = await youtube.channels.getAuthenticatedUser()

    console.dir(identity, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("YouTube get authenticated user", error)
})
