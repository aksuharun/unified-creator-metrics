import "dotenv/config"
import { createTwitchClient } from "@multi-platform-api/library"
import {
    getSmokeMessage,
    handleSmokeTestError,
    optionalEnv,
    requiredEnv,
} from "../../smoke/helpers.js"

/* global fetch */

const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix"
const TWITCH_AUTH_BASE_URL = "https://id.twitch.tv/oauth2"

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const accessToken = requiredEnv("TWITCH_USER_ACCESS_TOKEN")
    const twitch = createTwitchClient({
        clientId,
        accessToken,
    })
    const validation = await validateTwitchUserToken({ clientId, accessToken })
    const broadcasterId = await resolveBroadcasterId(twitch)
    const text = getSmokeMessage("TWITCH_CHAT_MESSAGE")

    console.log("Sending Twitch chat smoke-test message...")
    console.log("TWITCH_TOKEN_LOGIN:", validation.login ?? "(unknown)")
    console.log("TWITCH_SENDER_USER_ID:", validation.user_id)
    console.log("TWITCH_BROADCASTER_ID:", broadcasterId)
    console.log("TWITCH_CHAT_MESSAGE:", text)

    if (process.env.TWITCH_REPLY_PARENT_MESSAGE_ID) {
        console.log(
            "TWITCH_REPLY_PARENT_MESSAGE_ID:",
            process.env.TWITCH_REPLY_PARENT_MESSAGE_ID,
        )
    }

    const result = await sendChatMessage({
        clientId,
        accessToken,
        broadcasterId,
        senderId: validation.user_id,
        text,
        replyParentMessageId: process.env.TWITCH_REPLY_PARENT_MESSAGE_ID,
    })

    console.log("Twitch chat message sent.")
    console.dir(result, { depth: null })
}

async function resolveBroadcasterId(twitch) {
    if (process.env.TWITCH_BROADCASTER_ID) {
        return process.env.TWITCH_BROADCASTER_ID
    }

    const login = optionalEnv("TWITCH_BROADCASTER_LOGIN", "aksuharun")

    console.log("Resolving Twitch broadcaster identity...")
    console.log("TWITCH_BROADCASTER_LOGIN:", login)

    const identity = await twitch.channels.resolve({
        login,
    })

    return identity.broadcasterId
}

async function validateTwitchUserToken({ clientId, accessToken }) {
    const response = await fetch(`${TWITCH_AUTH_BASE_URL}/validate`, {
        headers: {
            Authorization: `OAuth ${accessToken}`,
        },
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(
            `Twitch token validation failed with ${response.status}: ${formatDetails(
                payload,
            )}`,
        )
    }

    if (!payload?.user_id) {
        throw new Error("Validated Twitch token response did not include user_id.")
    }

    if (payload.client_id !== clientId) {
        throw new Error(
            "TWITCH_USER_ACCESS_TOKEN was not issued for TWITCH_CLIENT_ID.",
        )
    }

    const scopes = Array.isArray(payload.scopes) ? payload.scopes : []

    if (!scopes.includes("user:write:chat")) {
        throw new Error(
            'TWITCH_USER_ACCESS_TOKEN must include the "user:write:chat" scope.',
        )
    }

    return payload
}

async function sendChatMessage({
    clientId,
    accessToken,
    broadcasterId,
    senderId,
    text,
    replyParentMessageId,
}) {
    const response = await fetch(`${TWITCH_API_BASE_URL}/chat/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Client-Id": clientId,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            broadcaster_id: broadcasterId,
            sender_id: senderId,
            message: text,
            ...(replyParentMessageId
                ? { reply_parent_message_id: replyParentMessageId }
                : {}),
        }),
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(
            `Twitch send chat message request failed with ${response.status}: ${formatDetails(
                payload,
            )}`,
        )
    }

    const result = payload?.data?.[0]

    if (!result) {
        throw new Error("Twitch send chat message response did not include data[0].")
    }

    if (result.is_sent !== true) {
        throw new Error(
            `Twitch accepted the request but did not send the message: ${formatDetails(
                result.drop_reason ?? null,
            )}`,
        )
    }

    return {
        platform: "twitch",
        messageId:
            result.message_id == null ? null : String(result.message_id),
        sentAt: null,
        raw: payload,
    }
}

async function readJsonResponse(response) {
    const text = await response.text()

    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

function formatDetails(value) {
    if (typeof value === "string") {
        return value
    }

    if (value == null) {
        return "(no details)"
    }

    return JSON.stringify(value)
}

main().catch((error) => {
    handleSmokeTestError("Twitch send message", error)
})
