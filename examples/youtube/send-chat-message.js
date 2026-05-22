import "dotenv/config"
import { createYoutubeClient } from "@multi-platform-api/library"
import {
    getSmokeMessage,
    handleSmokeTestError,
    requiredEnv,
    resolveYoutubeLiveChatId,
} from "../smoke-test-helpers.js"

async function main() {
    const accessToken = requiredEnv("YOUTUBE_ACCESS_TOKEN")
    const apiKey = process.env.YOUTUBE_API_KEY
    const liveChatId = await resolveYoutubeLiveChatId({ accessToken, apiKey })
    const text = getSmokeMessage("YOUTUBE_CHAT_MESSAGE")
    const youtube = createYoutubeClient({
        accessToken,
        apiKey,
    })

    console.log("Sending YouTube chat smoke-test message...")
    console.log("YOUTUBE_LIVE_CHAT_ID:", liveChatId)
    console.log("YOUTUBE_CHAT_MESSAGE:", text)

    const result = await youtube.chat.sendMessage({
        liveChatId,
        text,
    })

    console.log("YouTube chat message sent.")
    console.dir(result, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("YouTube send message", error)
})
