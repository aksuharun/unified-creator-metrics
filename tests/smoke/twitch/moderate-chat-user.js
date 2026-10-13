import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
    resolveTwitchBroadcasterId,
} from "../helpers.js"

const DEFAULT_TIMEOUT_SECONDS = 120

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const clientSecret = requiredEnv("TWITCH_CLIENT_SECRET")
    const refreshToken = requiredEnv("TWITCH_REFRESH_TOKEN")
    const broadcasterId = await resolveTwitchBroadcasterId()
    const userId = requiredEnv("TWITCH_MODERATION_USER_ID")
    const messageId = requiredEnv("TWITCH_DELETE_MESSAGE_ID")
    const durationSeconds = getPositiveIntegerEnv(
        "TWITCH_TIMEOUT_SECONDS",
        DEFAULT_TIMEOUT_SECONDS,
    )
    let needsUnban = false

    const twitch = createTwitchClient({
        clientId,
        clientSecret,
        userRefreshToken: refreshToken,
    })

    try {
        console.log("Deleting Twitch chat message through the library...")
        console.log("TWITCH_BROADCASTER_ID:", broadcasterId)
        console.log("TWITCH_DELETE_MESSAGE_ID:", messageId)

        const deletedMessage = await twitch.chat.deleteMessage({
            broadcasterId,
            messageId,
        })

        console.dir(deletedMessage, { depth: null })

        console.log("Creating Twitch timeout through the library...")
        console.log("TWITCH_MODERATION_USER_ID:", userId)
        console.log("TWITCH_TIMEOUT_SECONDS:", durationSeconds)

        const timeoutResult = await twitch.chat.timeoutUser({
            broadcasterId,
            userId,
            durationSeconds,
        })

        needsUnban = true
        console.dir(timeoutResult, { depth: null })

        console.log("Removing Twitch timeout through the library...")
        const timeoutRemoval = await twitch.chat.unbanUser({
            broadcasterId,
            userId,
        })

        needsUnban = false
        console.dir(timeoutRemoval, { depth: null })

        console.log("Creating Twitch permanent ban through the library...")
        const banResult = await twitch.chat.banUser({
            broadcasterId,
            userId,
        })

        needsUnban = true
        console.dir(banResult, { depth: null })

        console.log("Removing Twitch ban through the library...")
        const unbanResult = await twitch.chat.unbanUser({
            broadcasterId,
            userId,
        })

        needsUnban = false
        console.dir(unbanResult, { depth: null })
    } finally {
        if (needsUnban) {
            console.log("Cleaning up remaining Twitch moderation state...")
            await twitch.chat.unbanUser({
                broadcasterId,
                userId,
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
    handleSmokeTestError("Twitch moderation", error)
})
