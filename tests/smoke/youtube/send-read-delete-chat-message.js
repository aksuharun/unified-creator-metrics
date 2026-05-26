import "dotenv/config"
import { createYoutubeClient } from "unified-creator-metrics"
import {
    getYoutubeClientConfigFromEnv,
    handleSmokeTestError,
    resolveYoutubeLiveChatId,
} from "../helpers.js"
import {
    createMessageWaiter,
    createUniqueSmokeMessage,
    getChatReadTimeoutMs,
    getDeleteDelayMs,
    sleep,
} from "../chat-lifecycle-helpers.js"

async function main() {
    const config = getYoutubeClientConfigFromEnv()
    const youtube = createYoutubeClient(config)
    const liveChatId = await resolveYoutubeLiveChatId(config)
    const text = createUniqueSmokeMessage("YOUTUBE_CHAT_MESSAGE")
    const readTimeoutMs = getChatReadTimeoutMs()
    const deleteDelayMs = getDeleteDelayMs()
    let listener = null
    let receivedMessage = null
    let sentMessageId = null
    let deletedMessage = false

    try {
        console.log("YOUTUBE_LIVE_CHAT_ID:", liveChatId)
        console.log("Sending YouTube chat smoke-test message...")
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

        sentMessageId = sentMessage.messageId

        listener = youtube.chat.listen({
            liveChatId,
            includeHistory: true,
            pollingIntervalMs: 1000,
            maxResults: 200,
        })
        receivedMessage = createMessageWaiter(
            listener,
            (message) => message.id === sentMessageId || message.text === text,
            readTimeoutMs,
        )

        console.log("Reading YouTube chat history for the sent message...")
        console.log("YOUTUBE_MESSAGE_ID:", sentMessageId)

        await listener.start()

        const readMessage = await receivedMessage.promise

        if (readMessage.id !== sentMessageId) {
            throw new Error(
                `Read message id ${readMessage.id} did not match sent message id ${sentMessageId}.`,
            )
        }

        console.log("Read YouTube chat smoke-test message.")
        console.dir(readMessage, { depth: null })

        if (deleteDelayMs > 0) {
            console.log(`Waiting ${deleteDelayMs}ms before deleting the message...`)
            await sleep(deleteDelayMs)
        }

        console.log("Deleting YouTube chat smoke-test message...")

        const deleteResult = await youtube.chat.deleteMessage({
            messageId: sentMessageId,
        })

        deletedMessage = true
        console.dir(deleteResult, { depth: null })
    } finally {
        receivedMessage?.cancel()
        await listener?.stop()

        if (sentMessageId && !deletedMessage) {
            console.log("Cleaning up remaining YouTube chat smoke-test message...")

            try {
                await youtube.chat.deleteMessage({
                    messageId: sentMessageId,
                })
            } catch (error) {
                console.error("Cleanup deleteMessage() failed.")
                console.error(error)
            }
        }
    }
}

main().catch((error) => {
    handleSmokeTestError("YouTube send/read/delete chat message", error)
})
