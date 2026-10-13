import "dotenv/config"
import { createKickClient } from "unified-creator-metrics"
import {
    getSmokeMessage,
    handleSmokeTestError,
    optionalEnv,
    positiveIntegerEnv,
    requiredEnv,
    resolveKickBroadcasterUserId,
} from "../helpers.js"

const DEFAULT_TIMEOUT_SECONDS = 120

async function main() {
    const clientId = requiredEnv("KICK_CLIENT_ID")
    const clientSecret = requiredEnv("KICK_CLIENT_SECRET")
    const refreshToken = requiredEnv("KICK_REFRESH_TOKEN")
    const broadcasterUserId = await resolveKickBroadcasterUserId()
    const userId = positiveIntegerEnv("KICK_MODERATION_USER_ID")
    const text = getSmokeMessage("KICK_CHAT_MESSAGE")
    const durationSeconds = getKickTimeoutSeconds(
        "KICK_TIMEOUT_SECONDS",
        DEFAULT_TIMEOUT_SECONDS,
    )
    let needsUnban = false

    const kick = createKickClient({
        clientId,
        clientSecret,
        userRefreshToken: refreshToken,
    })

    try {
        console.log("Sending Kick chat smoke-test message...")
        console.log("KICK_BROADCASTER_USER_ID:", broadcasterUserId)
        console.log("KICK_CHAT_MESSAGE:", text)

        const sentMessage = await kick.chat.sendMessage({
            broadcasterUserId,
            text,
        })

        if (!sentMessage.messageId) {
            throw new Error(
                "Kick sendMessage() did not return a messageId for deleteMessage().",
            )
        }

        console.log("Deleting Kick chat smoke-test message...")
        console.log("KICK_MESSAGE_ID:", sentMessage.messageId)

        const deletedMessage = await kick.chat.deleteMessage({
            messageId: sentMessage.messageId,
        })

        console.dir(deletedMessage, { depth: null })

        console.log("Creating Kick timeout through the library...")
        console.log("KICK_MODERATION_USER_ID:", userId)
        console.log("KICK_TIMEOUT_SECONDS:", durationSeconds)

        const timeoutResult = await kick.chat.timeoutUser({
            broadcasterUserId,
            userId,
            durationSeconds,
        })

        needsUnban = true
        console.dir(timeoutResult, { depth: null })

        console.log("Removing Kick timeout through the library...")
        const timeoutRemoval = await kick.chat.unbanUser({
            broadcasterUserId,
            userId,
        })

        needsUnban = false
        console.dir(timeoutRemoval, { depth: null })

        console.log("Creating Kick permanent ban through the library...")
        const banResult = await kick.chat.banUser({
            broadcasterUserId,
            userId,
        })

        needsUnban = true
        console.dir(banResult, { depth: null })

        console.log("Removing Kick ban through the library...")
        const unbanResult = await kick.chat.unbanUser({
            broadcasterUserId,
            userId,
        })

        needsUnban = false
        console.dir(unbanResult, { depth: null })
    } finally {
        if (needsUnban) {
            console.log("Cleaning up remaining Kick moderation state...")
            await kick.chat.unbanUser({
                broadcasterUserId,
                userId,
            })
        }
    }
}

function getKickTimeoutSeconds(name, fallback) {
    const value = Number(optionalEnv(name, String(fallback)))

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer.`)
    }

    if (value % 60 !== 0) {
        throw new Error(`${name} must be a whole number of minutes in seconds.`)
    }

    return value
}

main().catch((error) => {
    handleSmokeTestError("Kick moderation", error)
})
