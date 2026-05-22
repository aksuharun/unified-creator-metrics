import "dotenv/config"
import { createYoutubeClient } from "@multi-platform-api/library"

const youtube = createYoutubeClient({
    apiKey: requiredEnv("YOUTUBE_API_KEY"),
})

const chat = youtube.chat.listen({
    liveVideoId: requiredEnv("YOUTUBE_LIVE_VIDEO_ID"),
    includeHistory: false,
    pollingIntervalMs: 5000,
})

chat.on("message", (message) => {
    console.log(
        `[youtube] [${message.sentAt}] ${message.author.displayName}: ${message.text}`,
    )
})

chat.on("error", (error) => {
    console.error("[youtube chat error]", error)
})

const setup = await chat.start()

console.log(`YouTube chat listener started for liveChatId=${setup.liveChatId}`)
console.log("Press Ctrl+C to stop.")

async function shutdown() {
    await chat.stop()
    process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

function requiredEnv(name) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`${name} is required.`)
    }

    return value
}
