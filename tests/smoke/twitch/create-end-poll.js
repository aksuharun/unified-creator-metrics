import "dotenv/config"
import { createTwitchClient } from "unified-creator-metrics"
import {
    getTwitchUserAccessToken,
    handleSmokeTestError,
    optionalEnv,
    positiveIntegerEnv,
    requiredEnv,
    resolveTwitchBroadcasterId,
} from "../helpers.js"

/* global fetch */

const REQUIRED_TWITCH_POLL_SCOPES = ["channel:manage:polls"]
const DEFAULT_TWITCH_POLL_CHOICES = ["Heads", "Tails"]
const DEFAULT_TWITCH_POLL_DURATION_SECONDS = 120

async function main() {
    const clientId = requiredEnv("TWITCH_CLIENT_ID")
    const accessToken = await getTwitchUserAccessToken()

    await ensureTwitchTokenScopes(accessToken, REQUIRED_TWITCH_POLL_SCOPES)

    const twitch = createTwitchClient({
        clientId,
        userAccessToken: accessToken,
    })
    const broadcasterId = await resolveTwitchBroadcasterId()
    const question = createUniquePollQuestion("TWITCH_POLL_QUESTION")
    const choices = getPollChoices(
        "TWITCH_POLL_CHOICES",
        DEFAULT_TWITCH_POLL_CHOICES,
    )
    const durationSeconds = getPollDurationSeconds()
    const channelPointsPerVote = getOptionalPositiveIntegerEnv(
        "TWITCH_POLL_CHANNEL_POINTS_PER_VOTE",
    )
    let activePollId = null

    try {
        console.log("Creating Twitch poll...")
        console.log("TWITCH_BROADCASTER_ID:", broadcasterId)
        console.log("TWITCH_POLL_QUESTION:", question)
        console.log("TWITCH_POLL_CHOICES:", choices.join(" | "))
        console.log("TWITCH_POLL_DURATION_SECONDS:", durationSeconds)

        const createdPoll = await twitch.polls.create({
            broadcasterId,
            question,
            choices,
            durationSeconds,
            ...(channelPointsPerVote === undefined
                ? {}
                : { channelPointsPerVote }),
        })

        activePollId = createdPoll.pollId
        assertPollResult(createdPoll, {
            platform: "twitch",
            expectedQuestion: question,
            expectedChoiceCount: choices.length,
            expectedStatus: "active",
            expectedEndReason: null,
        })
        console.dir(createdPoll, { depth: null })

        console.log("Ending Twitch poll...")

        const endedPoll = await twitch.polls.end({
            broadcasterId,
            pollId: activePollId,
        })

        activePollId = null
        assertPollResult(endedPoll, {
            platform: "twitch",
            expectedChoiceCount: choices.length,
            expectedStatus: "ended",
            expectedEndReason: "cancelled",
        })
        console.dir(endedPoll, { depth: null })
    } finally {
        if (activePollId) {
            console.log("Cleaning up remaining Twitch poll...")

            try {
                await twitch.polls.end({
                    broadcasterId,
                    pollId: activePollId,
                })
            } catch (error) {
                console.error("Cleanup polls.end() failed.")
                console.error(error)
            }
        }
    }
}

function createUniquePollQuestion(envName) {
    const configuredQuestion = process.env[envName] || "Smoke poll?"
    const suffix = ` [smoke:${Date.now()}]`
    const maxQuestionLength = 60
    const maxBaseLength = Math.max(0, maxQuestionLength - suffix.length)

    return `${configuredQuestion.slice(0, maxBaseLength)}${suffix}`
}

function getPollChoices(envName, fallback) {
    const rawValue = process.env[envName]
    const choices = rawValue
        ? rawValue.split("|").map((choice) => choice.trim()).filter(Boolean)
        : fallback

    if (choices.length < 2 || choices.length > 5) {
        throw new Error(`${envName} must contain 2 to 5 pipe-separated choices.`)
    }

    for (const choice of choices) {
        if (choice.length > 25) {
            throw new Error(`${envName} choices must be 25 characters or fewer.`)
        }
    }

    return choices
}

function getPollDurationSeconds() {
    if (process.env.TWITCH_POLL_DURATION_SECONDS) {
        return positiveIntegerEnv("TWITCH_POLL_DURATION_SECONDS")
    }

    return DEFAULT_TWITCH_POLL_DURATION_SECONDS
}

function getOptionalPositiveIntegerEnv(name) {
    const value = optionalEnv(name, "")

    if (!value) {
        return undefined
    }

    return positiveIntegerEnv(name)
}

async function ensureTwitchTokenScopes(accessToken, requiredScopes) {
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
            Authorization: `OAuth ${accessToken}`,
        },
    })
    const payload = await response.json()

    if (!response.ok) {
        throw new Error(`Twitch token validation failed with ${response.status}.`)
    }

    const scopes = Array.isArray(payload.scopes) ? payload.scopes : []
    const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope))

    if (missingScopes.length > 0) {
        throw new Error(
            `TWITCH_REFRESH_TOKEN must include these scopes for poll smoke tests: ${missingScopes.join(
                ", ",
            )}.`,
        )
    }
}

function assertPollResult(
    poll,
    { platform, expectedQuestion, expectedChoiceCount, expectedStatus, expectedEndReason },
) {
    if (poll.platform !== platform) {
        throw new Error(`Expected platform "${platform}", received "${poll.platform}".`)
    }

    if (!poll.pollId) {
        throw new Error("Poll result did not include pollId.")
    }

    if (expectedQuestion && poll.question !== expectedQuestion) {
        throw new Error(
            `Poll question "${poll.question}" did not match "${expectedQuestion}".`,
        )
    }

    if (poll.choices.length !== expectedChoiceCount) {
        throw new Error(
            `Expected ${expectedChoiceCount} poll choices, received ${poll.choices.length}.`,
        )
    }

    if (expectedStatus && poll.status !== expectedStatus) {
        throw new Error(
            `Expected poll status "${expectedStatus}", received "${poll.status}".`,
        )
    }

    if (poll.endReason !== expectedEndReason) {
        throw new Error(
            `Expected poll endReason "${expectedEndReason}", received "${poll.endReason}".`,
        )
    }
}

main().catch((error) => {
    handleSmokeTestError("Twitch create/end poll", error)
})
