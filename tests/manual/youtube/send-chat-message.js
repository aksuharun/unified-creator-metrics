import "dotenv/config"
import {
    createYoutubeClientFromEnv,
    getSmokeMessage,
    getYoutubeClientConfigFromEnv,
    handleSmokeTestError,
    resolveYoutubeLiveChatId,
} from "../../smoke/helpers.js"

async function main() {
    const liveChatId = await resolveYoutubeLiveChatId(
        getYoutubeClientConfigFromEnv(),
    )
    const text = getSmokeMessage("YOUTUBE_CHAT_MESSAGE")
    const youtube = createYoutubeClientFromEnv()

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
