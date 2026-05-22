import "dotenv/config"
import {
    createKickClient,
    createMultiPlatformClient,
    createYoutubeClient,
} from "@multi-platform-api/library"
import {
    getSmokeMessage,
    getKickUserAccessToken,
    handleSmokeTestError,
    positiveIntegerEnv,
    requiredEnv,
    resolveYoutubeLiveChatId,
} from "../../smoke/helpers.js"

async function main() {
    const platform = process.env.CHAT_PLATFORM || "youtube"
    const client = createMultiPlatformClient({
        kick: process.env.KICK_USER_ACCESS_TOKEN
            ? createKickClient({ accessToken: process.env.KICK_USER_ACCESS_TOKEN })
            : undefined,
        youtube: process.env.YOUTUBE_ACCESS_TOKEN
            ? createYoutubeClient({
                accessToken: process.env.YOUTUBE_ACCESS_TOKEN,
                apiKey: process.env.YOUTUBE_API_KEY,
            })
            : undefined,
    })

    if (platform === "youtube") {
        const accessToken = requiredEnv("YOUTUBE_ACCESS_TOKEN")
        const request = {
            platform,
            liveChatId: await resolveYoutubeLiveChatId({
                accessToken,
                apiKey: process.env.YOUTUBE_API_KEY,
            }),
            text: getSmokeMessage("YOUTUBE_CHAT_MESSAGE"),
        }

        console.log("Sending multi-platform YouTube chat smoke-test message...")
        console.log("YOUTUBE_LIVE_CHAT_ID:", request.liveChatId)
        console.log("YOUTUBE_CHAT_MESSAGE:", request.text)
        console.dir(await client.chats.sendMessage(request), { depth: null })
        return
    }

    if (platform === "kick") {
        const request = createKickSendMessageRequest()

        console.log("Sending multi-platform Kick chat smoke-test message...")
        console.log("KICK_CHAT_TYPE:", request.type ?? "user")
        console.log("KICK_CHAT_MESSAGE:", request.text)
        console.dir(
            await client.chats.sendMessage({
                platform,
                ...request,
            }),
            { depth: null },
        )
        return
    }

    throw new Error("CHAT_PLATFORM must be \"youtube\" or \"kick\".")
}

function createKickSendMessageRequest() {
    getKickUserAccessToken()

    const type = process.env.KICK_CHAT_TYPE || "user"
    const text = getSmokeMessage("KICK_CHAT_MESSAGE")

    if (type === "bot") {
        return {
            type,
            text,
        }
    }

    if (type !== "user") {
        throw new Error("KICK_CHAT_TYPE must be \"user\" or \"bot\".")
    }

    return {
        type,
        broadcasterUserId: positiveIntegerEnv("KICK_BROADCASTER_USER_ID"),
        text,
    }
}

main().catch((error) => {
    handleSmokeTestError("Multi-platform send message", error)
})
