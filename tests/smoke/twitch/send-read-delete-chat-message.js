import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    getTwitchUserAccessToken,
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"
import {
    createMessageWaiter,
    createUniqueSmokeMessage,
    getChatReadTimeoutMs,
    getDeleteDelayMs,
    sleep,
} from "../chat-lifecycle-helpers.js"

/* global fetch */

const REQUIRED_TWITCH_CHAT_SCOPES = [
    "user:read:chat",
    "user:write:chat",
    "moderator:manage:chat_messages",
]

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const accessToken = await getTwitchUserAccessToken()

    await ensureTwitchTokenScopes(accessToken, REQUIRED_TWITCH_CHAT_SCOPES)

    const twitch = createTwitchClient({
        clientId,
        userAccessToken: accessToken,
    })
    const broadcasterId = await resolveBroadcasterId(twitch)
    const text = createUniqueSmokeMessage("TWITCH_CHAT_MESSAGE")
    const readTimeoutMs = getChatReadTimeoutMs()
    const deleteDelayMs = getDeleteDelayMs()
    const listener = twitch.chat.listen({ broadcasterId })
    const receivedMessage = createMessageWaiter(
        listener,
        (message) => message.text === text,
        readTimeoutMs,
    )
    let sentMessageId = null
    let deletedMessage = false

    try {
        console.log("Starting Twitch chat listener for send/read/delete smoke test...")
        console.log("TWITCH_BROADCASTER_ID:", broadcasterId)

        await listener.start()

        console.log("Sending Twitch chat smoke-test message...")
        console.log("TWITCH_CHAT_MESSAGE:", text)

        const sentMessage = await twitch.chat.sendMessage({
            broadcasterId,
            text,
        })

        if (!sentMessage.messageId) {
            throw new Error(
                "Twitch sendMessage() did not return a messageId for deleteMessage().",
            )
        }

        sentMessageId = sentMessage.messageId

        console.log("Waiting for Twitch chat listener to read the sent message...")
        console.log("TWITCH_MESSAGE_ID:", sentMessageId)

        const readMessage = await receivedMessage.promise

        if (readMessage.id !== sentMessageId) {
            throw new Error(
                `Read message id ${readMessage.id} did not match sent message id ${sentMessageId}.`,
            )
        }

        console.log("Read Twitch chat smoke-test message.")
        console.dir(readMessage, { depth: null })

        if (deleteDelayMs > 0) {
            console.log(`Waiting ${deleteDelayMs}ms before deleting the message...`)
            await sleep(deleteDelayMs)
        }

        console.log("Deleting Twitch chat smoke-test message...")

        const deleteResult = await twitch.chat.deleteMessage({
            broadcasterId,
            messageId: sentMessageId,
        })

        deletedMessage = true
        console.dir(deleteResult, { depth: null })
    } finally {
        receivedMessage.cancel()
        await listener.stop({ unsubscribe: true })

        if (sentMessageId && !deletedMessage) {
            console.log("Cleaning up remaining Twitch chat smoke-test message...")

            try {
                await twitch.chat.deleteMessage({
                    broadcasterId,
                    messageId: sentMessageId,
                })
            } catch (error) {
                console.error("Cleanup deleteMessage() failed.")
                console.error(error)
            }
        }
    }
}

async function resolveBroadcasterId(twitch) {
    if (process.env.TWITCH_BROADCASTER_ID) {
        return process.env.TWITCH_BROADCASTER_ID
    }

    const identity = await twitch.channels.resolve({
        login: optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun"),
    })

    return identity.broadcasterId
}

async function ensureTwitchTokenScopes(accessToken, requiredScopes) {
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
            Authorization: `OAuth ${accessToken}`,
        },
    })
    const payload = await response.json()

    if (!response.ok) {
        throw new Error(`Twitch token validation failed with ${response.status}.`)
    }

    const scopes = Array.isArray(payload.scopes) ? payload.scopes : []
    const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope))

    if (missingScopes.length > 0) {
        throw new Error(
            `TWITCH_REFRESH_TOKEN must include these scopes for chat smoke tests: ${missingScopes.join(
                ", ",
            )}.`,
        )
    }
}

main().catch((error) => {
    handleSmokeTestError("Twitch send/read/delete chat message", error)
})
