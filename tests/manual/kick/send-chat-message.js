import "dotenv/config"
import { createKickClient } from "@multi-platform-api/library"
import {
    getSmokeMessage,
    getKickUserAccessToken,
    handleSmokeTestError,
    positiveIntegerEnv,
} from "../../smoke/helpers.js"

async function main() {
    const accessToken = getKickUserAccessToken()
    const kick = createKickClient({ accessToken })
    const request = createSendMessageRequest()

    console.log("Sending Kick chat smoke-test message...")
    console.log("KICK_CHAT_TYPE:", request.type ?? "user")
    console.log("KICK_CHAT_MESSAGE:", request.text)

    const result = await kick.chat.sendMessage(request)

    console.log("Kick chat message sent.")
    console.dir(result, { depth: null })
}

function createSendMessageRequest() {
    const type = process.env.KICK_CHAT_TYPE || "user"
    const text = getSmokeMessage("KICK_CHAT_MESSAGE")

    if (type === "bot") {
        return {
            type,
            text,
        }
    }

    if (type !== "user") {
        throw new Error("KICK_CHAT_TYPE must be \"user\" or \"bot\".")
    }

    return {
        type,
        broadcasterUserId: positiveIntegerEnv("KICK_BROADCASTER_USER_ID"),
        text,
    }
}

main().catch((error) => {
    handleSmokeTestError("Kick send message", error)
})
