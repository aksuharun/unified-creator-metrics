import { createYoutubeClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const youtube = createYoutubeClient({
        apiKey: requiredEnv("YOUTUBE_API_KEY"),
    })

    const channelId = optionalEnv("YOUTUBE_CHANNEL_ID", "UCGy9vOmYGW7quWUxJMQbvUg")

    console.log("Fetching YouTube active streams for channel:", channelId)
    const active = await youtube.livestreams.getActive({
        channelId,
    })
    console.log("Active streams:", active)

    console.log("Fetching YouTube scheduled streams for channel:", channelId)
    const scheduled = await youtube.livestreams.getScheduled({
        channelId,
    })
    console.log("Scheduled streams:", scheduled)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("YouTube livestreams", error)
}
