import "dotenv/config"
import {
    createKickClient,
    createMultiPlatformClient,
} from "unified-creator-metrics"
import {
    createYoutubeClientFromEnv,
    getSmokeMessage,
    getKickUserAccessToken,
    getYoutubeClientConfigFromEnv,
    hasYoutubeRefreshTokenConfig,
    handleSmokeTestError,
    positiveIntegerEnv,
    resolveYoutubeLiveChatId,
} from "../../smoke/helpers.js"

async function main() {
    const platform = process.env.CHAT_PLATFORM || "youtube"
    const client = createMultiPlatformClient({
        kick: process.env.KICK_USER_ACCESS_TOKEN
            ? createKickClient({
                userAccessToken: process.env.KICK_USER_ACCESS_TOKEN,
            })
            : undefined,
        youtube: hasYoutubeRefreshTokenConfig()
            ? createYoutubeClientFromEnv()
            : undefined,
    })

    if (platform === "youtube") {
        const request = {
            platform,
            liveChatId: await resolveYoutubeLiveChatId(
                getYoutubeClientConfigFromEnv(),
            ),
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
