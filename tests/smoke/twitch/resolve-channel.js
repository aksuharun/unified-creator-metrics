import "dotenv/config"
import { createTwitchClient } from "@multi-platform-api/library"
import {
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const twitch = createTwitchClient({
        clientId: requiredEnv("TWITCH_CLIENT_ID"),
        accessToken: requiredEnv("TWITCH_APP_ACCESS_TOKEN"),
    })
    const login = optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun")

    console.log("Resolving Twitch broadcaster identity...")
    console.log("TWITCH_BROADCASTER_LOGIN:", login)

    const identity = await twitch.channels.resolve({
        login,
    })

    console.dir(identity, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("Twitch channel resolve", error)
})
