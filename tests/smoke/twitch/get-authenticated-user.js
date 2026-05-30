import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const clientSecret = requiredEnv("TWITCH_CLIENT_SECRET")
    const userRefreshToken = requiredEnv("TWITCH_REFRESH_TOKEN")
    const twitch = createTwitchClient({
        clientId,
        clientSecret,
        userRefreshToken,
    })

    console.log("Fetching Twitch authenticated user identity...")

    const identity = await twitch.channels.getAuthenticatedUser()

    console.dir(identity, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("Twitch get authenticated user", error)
})
