import "dotenv/config"
import { createServer } from "node:http"
import { createKickClient } from "@multi-platform-api/library"
import { getKickAppAccessToken, optionalEnv } from "../smoke-test-helpers.js"

const accessToken = await getKickAppAccessToken()
const broadcasterUserId = Number(requiredEnv("KICK_BROADCASTER_USER_ID"))
const port = Number(process.env.PORT || 8090)
const webhookPath = process.env.KICK_WEBHOOK_PATH || "/kick/webhook"
const webhookPaths = new Set([webhookPath, "/"])
const verifySignature = process.env.KICK_VERIFY_SIGNATURE !== "0"
const webhookCallbackUrl = optionalEnv("KICK_WEBHOOK_CALLBACK_URL", "")
const subscriptionMode =
    process.env.KICK_SUBSCRIPTION_MODE || (webhookCallbackUrl ? "ensure" : "create")

if (!Number.isInteger(broadcasterUserId)) {
    throw new Error("KICK_BROADCASTER_USER_ID must be an integer.")
}

if (!["ensure", "create", "manual"].includes(subscriptionMode)) {
    throw new Error(
        "KICK_SUBSCRIPTION_MODE must be one of: ensure, create, manual.",
    )
}

const kick = createKickClient({
    accessToken,
})

const chat = kick.chat.listen({
    broadcasterUserId,
    subscription: subscriptionMode,
    webhook: {
        verifySignature,
        ...(webhookCallbackUrl ? { callbackUrl: webhookCallbackUrl } : {}),
    },
})

chat.on("message", (message) => {
    console.log(
        `[kick] [${message.sentAt}] ${message.author.displayName}: ${message.text}`,
    )
})

chat.on("error", (error) => {
    console.error("[kick chat error]", error)
})

const setup = await chat.start()

console.log("Kick chat listener started.")
console.log("Subscriptions:", setup.subscriptions)
console.log(`Subscription mode: ${subscriptionMode}`)
if (webhookCallbackUrl) {
    console.log(`Expected callback URL: ${webhookCallbackUrl}`)
} else {
    console.log(
        "No KICK_WEBHOOK_CALLBACK_URL provided; defaulting to subscription mode \"create\" unless overridden.",
    )
}
console.log(`Signature verification: ${verifySignature ? "enabled" : "disabled"}`)
console.log("Run npm run build after changing src/ before rerunning this example.")
console.log("Configure your Kick app webhook URL to the exact path:")
console.log(`https://YOUR_PUBLIC_DOMAIN${webhookPath}`)
console.log("This example also accepts POST / for tunnel-root webhook URLs.")
console.log("When using cloudflared, copy the https://*.trycloudflare.com URL.")
console.log(`Example: https://YOUR-TUNNEL.trycloudflare.com${webhookPath}`)
console.log("Local checks:")
console.log(`curl http://localhost:${port}/health`)

const server = createServer(async (request, response) => {
    console.log(`Incoming request: ${request.method} ${request.url}`)

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

    if (request.method === "POST") {
        console.warn(`Webhook POST reached unsupported path ${request.url}.`)
    }

    response.writeHead(404, { "Content-Type": "text/plain" })
    response.end("Not found")
})

server.listen(port, () => {
    console.log(`Webhook server listening on http://localhost:${port}`)
})

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
