import "dotenv/config"
import { createServer } from "node:http"
import { URL } from "node:url"
import { createKickClient } from "unified-creator-metrics"
import {
    getKickAppAccessToken,
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
    resolveKickBroadcasterUserId,
} from "../helpers.js"
import {
    createMessageWaiter,
    createUniqueSmokeMessage,
    getChatReadTimeoutMs,
    getDeleteDelayMs,
    sleep,
} from "../chat-lifecycle-helpers.js"

async function main() {
    const broadcasterUserId = await resolveKickBroadcasterUserId()
    const callbackUrl = requiredEnv("KICK_WEBHOOK_CALLBACK_URL")
    const webhookPath = optionalEnv(
        "KICK_WEBHOOK_PATH",
        getPathFromUrl(callbackUrl) ?? "/kick/webhook",
    )
    const webhookPaths = new Set([webhookPath, getPathFromUrl(callbackUrl), "/"])
    const subscriptionMode = optionalEnv("KICK_SUBSCRIPTION_MODE", "ensure")
    const verifySignature = process.env.KICK_VERIFY_SIGNATURE !== "0"
    const port = getPort()
    const kick = createKickClient({
        appAccessToken: await getKickAppAccessToken(),
        clientId: requiredEnv("KICK_CLIENT_ID"),
        clientSecret: requiredEnv("KICK_CLIENT_SECRET"),
        userRefreshToken: requiredEnv("KICK_REFRESH_TOKEN"),
    })
    const text = createUniqueSmokeMessage("KICK_CHAT_MESSAGE")
    const readTimeoutMs = getChatReadTimeoutMs()
    const deleteDelayMs = getDeleteDelayMs()
    const listener = kick.chat.listen({
        broadcasterUserId,
        subscription: getKickSubscriptionMode(subscriptionMode),
        webhook: {
            callbackUrl,
            verifySignature,
        },
    })
    const receivedMessage = createMessageWaiter(
        listener,
        (message) => message.text === text,
        readTimeoutMs,
    )
    const server = createWebhookServer({ listener, webhookPaths })
    let sentMessageId = null
    let deletedMessage = false
    let serverStarted = false

    try {
        await listen(server, port)
        serverStarted = true

        console.log("Starting Kick chat listener for send/read/delete smoke test...")
        console.log("KICK_BROADCASTER_USER_ID:", broadcasterUserId)
        console.log("KICK_WEBHOOK_PATH:", webhookPath)
        console.log("KICK_SUBSCRIPTION_MODE:", subscriptionMode)

        await listener.start()

        console.log("Sending Kick chat smoke-test message...")
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

        sentMessageId = sentMessage.messageId

        console.log("Waiting for Kick chat listener to read the sent message...")
        console.log("KICK_MESSAGE_ID:", sentMessageId)

        const readMessage = await receivedMessage.promise

        if (readMessage.id !== sentMessageId) {
            throw new Error(
                `Read message id ${readMessage.id} did not match sent message id ${sentMessageId}.`,
            )
        }

        console.log("Read Kick chat smoke-test message.")
        console.dir(readMessage, { depth: null })

        if (deleteDelayMs > 0) {
            console.log(`Waiting ${deleteDelayMs}ms before deleting the message...`)
            await sleep(deleteDelayMs)
        }

        console.log("Deleting Kick chat smoke-test message...")

        const deleteResult = await kick.chat.deleteMessage({
            messageId: sentMessageId,
        })

        deletedMessage = true
        console.dir(deleteResult, { depth: null })
    } finally {
        receivedMessage.cancel()
        await listener.stop({ unsubscribe: true })

        if (serverStarted) {
            await closeServer(server)
        }

        if (sentMessageId && !deletedMessage) {
            console.log("Cleaning up remaining Kick chat smoke-test message...")

            try {
                await kick.chat.deleteMessage({
                    messageId: sentMessageId,
                })
            } catch (error) {
                console.error("Cleanup deleteMessage() failed.")
                console.error(error)
            }
        }
    }
}

function createWebhookServer({ listener, webhookPaths }) {
    return createServer(async (request, response) => {
        if (request.method === "GET" && request.url === "/health") {
            response.writeHead(200, { "Content-Type": "text/plain" })
            response.end("ok")
            return
        }

        if (request.method === "POST" && webhookPaths.has(request.url)) {
            try {
                await listener.handleNodeWebhook(request)
                response.writeHead(204)
                response.end()
            } catch (error) {
                console.error("Kick webhook rejected.")
                console.error(error)
                response.writeHead(400, { "Content-Type": "text/plain" })
                response.end("Invalid Kick webhook")
            }

            return
        }

        response.writeHead(404, { "Content-Type": "text/plain" })
        response.end("Not found")
    })
}

function getKickSubscriptionMode(value) {
    if (value === "ensure" || value === "create") {
        return value
    }

    throw new Error("KICK_SUBSCRIPTION_MODE must be \"ensure\" or \"create\".")
}

function getPort() {
    const value = Number(optionalEnv("PORT", "8090"))

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error("PORT must be a positive integer.")
    }

    return value
}

function getPathFromUrl(value) {
    try {
        return new URL(value).pathname
    } catch {
        return null
    }
}

function listen(server, port) {
    return new Promise((resolve, reject) => {
        server.once("error", reject)
        server.listen(port, () => {
            server.off("error", reject)
            resolve()
        })
    })
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error)
                return
            }

            resolve()
        })
    })
}

main().catch((error) => {
    handleSmokeTestError("Kick send/read/delete chat message", error)
})
