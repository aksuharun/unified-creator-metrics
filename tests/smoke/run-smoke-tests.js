import { spawn } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const smokeSuites = {
    youtube: [
        "youtube/lookup-channel-identity.js",
        "youtube/fetch-channel-metrics.js",
        "youtube/fetch-video-metrics.js",
    ],
    kick: [
        "kick/lookup-channel-identity.js",
        "kick/fetch-live-viewer-count.js",
    ],
    twitch: [
        "twitch/lookup-channel-identity.js",
        "twitch/fetch-channel-metrics.js",
        "twitch/fetch-live-viewer-count.js",
    ],
    "multi-platform": [
        "multi-platform/route-channel-metrics.js",
        "multi-platform/route-video-metrics.js",
    ],
    chat: [
        "youtube/send-read-delete-chat-message.js",
        "twitch/send-read-delete-chat-message.js",
        "kick/send-read-delete-chat-message.js",
    ],
    "chat:youtube": [
        "youtube/send-read-delete-chat-message.js",
    ],
    "chat:twitch": [
        "twitch/send-read-delete-chat-message.js",
    ],
    "chat:kick": [
        "kick/send-read-delete-chat-message.js",
    ],
    auth: [
        "youtube/refresh-user-access-token.js",
        "twitch/refresh-user-access-token.js",
        "kick/refresh-user-access-token.js",
    ],
    moderation: [
        "youtube/moderate-chat-user.js",
        "twitch/moderate-chat-user.js",
        "kick/moderate-chat-user.js",
    ],
    polls: [
        "youtube/create-end-poll.js",
        "twitch/create-end-poll.js",
    ],
    "polls:youtube": [
        "youtube/create-end-poll.js",
    ],
    "polls:twitch": [
        "twitch/create-end-poll.js",
    ],
    livestreams: [
        "youtube/fetch-livestreams.js",
        "twitch/fetch-livestreams.js",
        "kick/fetch-livestreams.js",
    ],
    "livestreams:youtube": [
        "youtube/fetch-livestreams.js",
    ],
    "livestreams:twitch": [
        "twitch/fetch-livestreams.js",
    ],
    "livestreams:kick": [
        "kick/fetch-livestreams.js",
    ],
}

const defaultExcludedSuites = new Set([
    "chat",
    "chat:youtube",
    "chat:twitch",
    "chat:kick",
    "auth",
    "moderation",
    "polls",
    "polls:youtube",
    "polls:twitch",
    "livestreams",
    "livestreams:youtube",
    "livestreams:twitch",
    "livestreams:kick",
])

async function main() {
    const selection = process.argv[2]
    const suites = selection
        ? [selection]
        : Object.keys(smokeSuites).filter(
            (suite) => !defaultExcludedSuites.has(suite),
        )
    const invalidSuites = suites.filter((suite) => !(suite in smokeSuites))

    if (invalidSuites.length > 0) {
        throw new Error(
            `Unknown smoke suite: ${invalidSuites.join(", ")}. Expected one of: ${Object.keys(
                smokeSuites,
            ).join(", ")}.`,
        )
    }

    const files = suites.flatMap((suite) => smokeSuites[suite])

    console.log(`Running ${files.length} smoke test scripts...`)

    for (const relativeFile of files) {
        await runSmokeScript(relativeFile)
    }

    console.log("Smoke suite completed successfully.")
}

function runSmokeScript(relativeFile) {
    const absoluteFile = path.join(__dirname, relativeFile)

    return new Promise((resolve, reject) => {
        console.log(`\n=== ${relativeFile} ===`)

        const child = spawn(process.execPath, [absoluteFile], {
            cwd: path.resolve(__dirname, "..", ".."),
            stdio: "inherit",
            env: process.env,
        })

        child.on("exit", (code, signal) => {
            if (code === 0) {
                resolve()
                return
            }

            reject(
                new Error(
                    signal
                        ? `${relativeFile} exited from signal ${signal}.`
                        : `${relativeFile} exited with code ${code}.`,
                ),
            )
        })

        child.on("error", reject)
    })
}

await main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
