import "dotenv/config"
import { createKickClient, refreshKickAccessToken } from "unified-creator-metrics"
import {
    handleSmokeTestError,
    requiredEnv,
} from "../helpers.js"

async function main() {
    const clientId = requiredEnv("KICK_CLIENT_ID")
    const clientSecret = requiredEnv("KICK_CLIENT_SECRET")
    const userRefreshToken = requiredEnv("KICK_REFRESH_TOKEN")

    console.log("Refreshing Kick user access token...")
    const refreshed = await refreshKickAccessToken({
        clientId,
        clientSecret,
        refreshToken: userRefreshToken,
    })

    console.log("Refreshed user token: ", refreshed.accessToken ? "SUCCESS" : "FAIL")

    console.log("Fetching Kick raw authenticated user response...")
    const response = await fetch("https://api.kick.com/public/v1/users", {
        headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
        },
    })

    const payload = await response.json()
    console.log("=== RAW KICK USER RESPONSE ===")
    console.dir(payload, { depth: null })

    const kick = createKickClient({
        clientId,
        clientSecret,
        userRefreshToken,
    })

    console.log("\nCalling getAuthenticatedUser()...")
    const identity = await kick.channels.getAuthenticatedUser()
    console.dir(identity, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("Kick get authenticated user", error)
})
