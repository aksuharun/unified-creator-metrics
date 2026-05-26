import "dotenv/config"
import { createYoutubeClient } from "unified-creator-metrics"
import {
    getSmokeMessage,
    getYoutubeClientConfigFromEnv,
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
    resolveYoutubeLiveChatId,
} from "../helpers.js"

const DEFAULT_TIMEOUT_SECONDS = 120

async function main() {
    const config = getYoutubeClientConfigFromEnv()
    const youtube = createYoutubeClient(config)
    const liveChatId = await resolveYoutubeLiveChatId(config)
    const userId = requiredEnv("YOUTUBE_MODERATION_USER_ID")
    const text = getSmokeMessage("YOUTUBE_CHAT_MESSAGE")
    const durationSeconds = getPositiveIntegerEnv(
        "YOUTUBE_TIMEOUT_SECONDS",
        DEFAULT_TIMEOUT_SECONDS,
    )
    let activeBanId = null

    try {
        console.log("Sending YouTube chat smoke-test message...")
        console.log("YOUTUBE_LIVE_CHAT_ID:", liveChatId)
        console.log("YOUTUBE_CHAT_MESSAGE:", text)

        const sentMessage = await youtube.chat.sendMessage({
            liveChatId,
            text,
        })

        if (!sentMessage.messageId) {
            throw new Error(
                "YouTube sendMessage() did not return a messageId for deleteMessage().",
            )
        }

        console.log("Deleting YouTube chat smoke-test message...")
        console.log("YOUTUBE_MESSAGE_ID:", sentMessage.messageId)

        const deletedMessage = await youtube.chat.deleteMessage({
            messageId: sentMessage.messageId,
        })

        console.dir(deletedMessage, { depth: null })

        console.log("Creating YouTube timeout through the library...")
        console.log("YOUTUBE_MODERATION_USER_ID:", userId)
        console.log("YOUTUBE_TIMEOUT_SECONDS:", durationSeconds)

        const timeoutResult = await youtube.chat.timeoutUser({
            liveChatId,
            userId,
            durationSeconds,
        })

        if (!timeoutResult.banId) {
            throw new Error(
                "YouTube timeoutUser() did not return banId required for unbanUser().",
            )
        }

        activeBanId = timeoutResult.banId
        console.dir(timeoutResult, { depth: null })

        console.log("Removing YouTube timeout through the library...")
        const timeoutRemoval = await youtube.chat.unbanUser({
            banId: activeBanId,
        })

        activeBanId = null
        console.dir(timeoutRemoval, { depth: null })

        console.log("Creating YouTube permanent ban through the library...")
        const banResult = await youtube.chat.banUser({
            liveChatId,
            userId,
        })

        if (!banResult.banId) {
            throw new Error(
                "YouTube banUser() did not return banId required for unbanUser().",
            )
        }

        activeBanId = banResult.banId
        console.dir(banResult, { depth: null })

        console.log("Removing YouTube ban through the library...")
        const unbanResult = await youtube.chat.unbanUser({
            banId: activeBanId,
        })

        activeBanId = null
        console.dir(unbanResult, { depth: null })
    } finally {
        if (activeBanId) {
            console.log("Cleaning up remaining YouTube moderation state...")
            await youtube.chat.unbanUser({
                banId: activeBanId,
            })
        }
    }
}

function getPositiveIntegerEnv(name, fallback) {
    const value = Number(optionalEnv(name, String(fallback)))

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer.`)
    }

    return value
}

main().catch((error) => {
    handleSmokeTestError("YouTube moderation", error)
})
