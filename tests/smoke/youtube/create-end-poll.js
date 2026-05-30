import "dotenv/config"
import { createYoutubeClient } from "unified-creator-metrics"
import {
    getYoutubeClientConfigFromEnv,
    handleSmokeTestError,
    resolveYoutubeLiveChatId,
} from "../helpers.js"

const DEFAULT_YOUTUBE_POLL_CHOICES = ["APIs", "SDKs"]

async function main() {
    const config = getYoutubeClientConfigFromEnv()
    const youtube = createYoutubeClient(config)
    const liveChatId = await resolveYoutubeLiveChatId(config)
    const question = createUniquePollQuestion("YOUTUBE_POLL_QUESTION")
    const choices = getPollChoices(
        "YOUTUBE_POLL_CHOICES",
        DEFAULT_YOUTUBE_POLL_CHOICES,
    )
    let activePollId = null

    try {
        console.log("Creating YouTube live chat poll...")
        console.log("YOUTUBE_LIVE_CHAT_ID:", liveChatId)
        console.log("YOUTUBE_POLL_QUESTION:", question)
        console.log("YOUTUBE_POLL_CHOICES:", choices.join(" | "))

        const createdPoll = await youtube.polls.create({
            liveChatId,
            question,
            choices,
        })

        activePollId = createdPoll.pollId
        assertPollResult(createdPoll, {
            platform: "youtube",
            expectedQuestion: question,
            expectedChoiceCount: choices.length,
            expectedStatus: "active",
            expectedEndReason: null,
        })
        console.dir(createdPoll, { depth: null })

        console.log("Closing YouTube live chat poll...")

        const endedPoll = await youtube.polls.end({
            pollId: activePollId,
        })

        activePollId = null
        assertPollResult(endedPoll, {
            platform: "youtube",
            expectedChoiceCount: choices.length,
            expectedStatus: "ended",
            expectedEndReason: "completed",
        })
        console.dir(endedPoll, { depth: null })
    } finally {
        if (activePollId) {
            console.log("Cleaning up remaining YouTube live chat poll...")

            try {
                await youtube.polls.end({
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
    const maxQuestionLength = 100
    const maxBaseLength = Math.max(0, maxQuestionLength - suffix.length)

    return `${configuredQuestion.slice(0, maxBaseLength)}${suffix}`
}

function getPollChoices(envName, fallback) {
    const rawValue = process.env[envName]
    const choices = rawValue
        ? rawValue.split("|").map((choice) => choice.trim()).filter(Boolean)
        : fallback

    if (choices.length < 2 || choices.length > 4) {
        throw new Error(`${envName} must contain 2 to 4 pipe-separated choices.`)
    }

    return choices
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
    handleSmokeTestError("YouTube create/end poll", error)
})
