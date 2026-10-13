import "dotenv/config"
import { createKickClient } from "unified-creator-metrics"
import {
    getSmokeMessage,
    handleSmokeTestError,
    requiredEnv,
    resolveKickBroadcasterUserId,
} from "../helpers.js"

async function main() {
    const clientId = requiredEnv("KICK_CLIENT_ID")
    const clientSecret = requiredEnv("KICK_CLIENT_SECRET")
    const refreshToken = requiredEnv("KICK_REFRESH_TOKEN")
    const broadcasterUserId = await resolveKickBroadcasterUserId()

    let tokenUpdate
    const kick = createKickClient({
        clientId,
        clientSecret,
        userRefreshToken: refreshToken,
        onUserTokenUpdate(tokens) {
            tokenUpdate = tokens
        },
    })
    const text = getSmokeMessage("KICK_CHAT_MESSAGE")

    console.log("Sending Kick chat message with refresh-token auth...")
    console.log("KICK_BROADCASTER_USER_ID:", broadcasterUserId)
    console.log("KICK_CHAT_MESSAGE:", text)

    const result = await kick.chat.sendMessage({
        broadcasterUserId,
        text,
    })

    console.log("Kick chat message sent.")
    console.dir(result, { depth: null })

    if (!tokenUpdate?.accessToken) {
        throw new Error(
            "Kick refresh-user-access-token smoke test did not observe onUserTokenUpdate().",
        )
    }

    console.log("KICK_TOKEN_REFRESHED:", true)
    console.log("KICK_REFRESHED_EXPIRES_IN:", tokenUpdate.expiresIn)
}

main().catch((error) => {
    handleSmokeTestError("Kick refresh user access token", error)
})
