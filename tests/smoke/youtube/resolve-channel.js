import "dotenv/config"
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
    const handle = optionalEnv("YOUTUBE_CHANNEL_HANDLE", "@HARUN-AKSU")

    console.log("Resolving YouTube channel identity...")
    console.log("YOUTUBE_CHANNEL_HANDLE:", handle)

    const identity = await youtube.channels.resolve({
        handle,
    })

    console.dir(identity, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("YouTube channel resolve", error)
})
