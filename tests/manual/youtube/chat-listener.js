import "dotenv/config"
import { createYoutubeClient } from "unified-creator-metrics"

const youtube = createYoutubeClient({
    apiKey: requiredEnv("YOUTUBE_API_KEY"),
})

const transport = process.argv[2] ?? "polling"
const target = process.env.YOUTUBE_LIVE_CHAT_ID
    ? { liveChatId: requiredEnv("YOUTUBE_LIVE_CHAT_ID") }
    : { liveVideoId: requiredEnv("YOUTUBE_LIVE_VIDEO_ID") }
const chat = youtube.chat.listen({
    ...target,
    transport,
    includeHistory: false,
    ...(transport === "polling" ? { pollingIntervalMs: 5000 } : {}),
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

console.log(`YouTube ${transport} listener started for liveChatId=${setup.liveChatId}`)
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
