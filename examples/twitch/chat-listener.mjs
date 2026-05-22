import "dotenv/config"
import { createTwitchClient } from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../smoke-test-helpers.mjs"

async function main() {
    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        accessToken: requiredEnv("TWITCH_USER_ACCESS_TOKEN"),
    })
    let broadcasterId = process.env.TWITCH_BROADCASTER_ID

    if (!broadcasterId) {
        const login = optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun")

        console.log("Resolving Twitch broadcaster identity...")
        console.log("TWITCH_BROADCASTER_LOGIN:", login)

        const identity = await twitch.channels.resolve({
            login,
        })

        broadcasterId = identity.broadcasterId
    }

    const chat = twitch.chat.listen({
        broadcasterId,
        keepaliveTimeoutSeconds: 30,
    })

    chat.on("message", (message) => {
        console.log(
            `[twitch] [${message.sentAt}] ${message.author.displayName}: ${message.text}`,
        )
    })

    chat.on("error", (error) => {
        console.error("[twitch chat error]", error)
    })

    const setup = await chat.start()

    console.log(
        `Twitch chat listener started for broadcasterId=${setup.broadcasterId} sessionId=${setup.sessionId}`,
    )
    console.log(`Authenticated chat user id=${setup.userId}`)
    console.log("Press Ctrl+C to stop.")

    async function shutdown() {
        await chat.stop({
            unsubscribe: true,
        })
        process.exit(0)
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
}

main().catch((error) => {
    handleSmokeTestError("Twitch chat listener", error)
})
