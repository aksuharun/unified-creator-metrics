import "dotenv/config"
import { createServer } from "node:http"
import {
    createMultiPlatformClient,
    createKickClient,
    createYoutubeClient,
} from "@multi-platform-api/library"
import { getKickAppAccessToken, optionalEnv } from "../smoke-test-helpers.mjs"

const port = Number(process.env.PORT || 8090)
const webhookPath = process.env.KICK_WEBHOOK_PATH || "/kick/webhook"
const webhookPaths = new Set([webhookPath, "/"])
const verifySignature = process.env.KICK_VERIFY_SIGNATURE !== "0"
const webhookCallbackUrl = optionalEnv("KICK_WEBHOOK_CALLBACK_URL", "")
const subscriptionMode =
    process.env.KICK_SUBSCRIPTION_MODE || (webhookCallbackUrl ? "ensure" : "create")
const broadcasterUserId = Number(requiredEnv("KICK_BROADCASTER_USER_ID"))

if (!Number.isInteger(broadcasterUserId)) {
    throw new Error("KICK_BROADCASTER_USER_ID must be an integer.")
}

if (!["ensure", "create", "manual"].includes(subscriptionMode)) {
    throw new Error(
        "KICK_SUBSCRIPTION_MODE must be one of: ensure, create, manual.",
    )
}

const kick = createKickClient({
    accessToken: await getKickAppAccessToken(),
})

const youtube = createYoutubeClient({
    apiKey: requiredEnv("YOUTUBE_API_KEY"),
})

const client = createMultiPlatformClient({
    kick,
    youtube,
})

const chat = client.chats.listen([
    {
        platform: "kick",
        broadcasterUserId,
        subscription: subscriptionMode,
        webhook: {
            verifySignature,
            ...(webhookCallbackUrl ? { callbackUrl: webhookCallbackUrl } : {}),
        },
    },
    {
        platform: "youtube",
        liveVideoId: requiredEnv("YOUTUBE_LIVE_VIDEO_ID"),
        includeHistory: false,
        pollingIntervalMs: 2000,
    },
])

function logMessage(message) {
    console.log(
        `[${message.platform}] [${message.sentAt}] ${message.author.displayName}: ${message.text}`,
    )
}

chat.on("message", logMessage)

chat.on("error", (error) => {
    console.error("[multi-platform chat error]", error)
})

const setup = await chat.start()
const kickSetup = setup.find((item) => item.platform === "kick")
const youtubeSetup = setup.find((item) => item.platform === "youtube")

console.log("Multi-platform chat listeners started.")
console.log("Kick subscriptions:", kickSetup?.subscriptions ?? [])
console.log(`Kick subscription mode: ${subscriptionMode}`)
if (webhookCallbackUrl) {
    console.log(`Kick expected callback URL: ${webhookCallbackUrl}`)
} else {
    console.log(
        "No KICK_WEBHOOK_CALLBACK_URL provided; defaulting Kick to subscription mode \"create\" unless overridden.",
    )
}
console.log(`Kick signature verification: ${verifySignature ? "enabled" : "disabled"}`)
console.log(`YouTube liveChatId: ${youtubeSetup?.liveChatId ?? "n/a"}`)
console.log("Configure your Kick app webhook URL to:")
console.log(`https://YOUR_PUBLIC_DOMAIN${webhookPath}`)
console.log("This example also accepts POST / for tunnel-root webhook URLs.")
console.log(`HTTP server listening on http://localhost:${port}`)

const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200, { "Content-Type": "text/plain" })
        response.end("ok")
        return
    }

    if (request.method === "GET" && request.url === webhookPath) {
        response.writeHead(200, { "Content-Type": "text/plain" })
        response.end(
            `Kick webhook endpoint is reachable. Configure Kick to POST to ${webhookPath}.`,
        )
        return
    }

    if (request.method === "POST" && webhookPaths.has(request.url)) {
        try {
            if (request.url !== webhookPath) {
                console.warn(
                    `Webhook POST reached ${request.url}; accepting it as a Kick webhook. Prefer configuring Kick to POST to ${webhookPath}.`,
                )
            }

            const result = await chat.handleNodeWebhook(request)

            console.log("Kick webhook accepted:", result)

            response.writeHead(204)
            response.end()
        } catch (error) {
            console.error("Kick webhook rejected.", error)
            response.writeHead(400, { "Content-Type": "text/plain" })
            response.end("Invalid Kick webhook")
        }

        return
    }

    response.writeHead(404, { "Content-Type": "text/plain" })
    response.end("Not found")
})

server.listen(port)

async function shutdown() {
    server.close()
    await chat.stop()
    process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

function requiredEnv(name) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`${name} is required.`)
    }

    return value
}
