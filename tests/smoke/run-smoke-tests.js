import { spawn } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const smokeSuites = {
    youtube: [
        "youtube/resolve-channel.js",
        "youtube/channel-metrics.js",
        "youtube/video-metrics.js",
    ],
    kick: [
        "kick/resolve-channel.js",
        "kick/concurrent-viewers.js",
    ],
    twitch: [
        "twitch/resolve-channel.js",
        "twitch/channel-metrics.js",
        "twitch/concurrent-viewers.js",
    ],
    "multi-platform": [
        "multi-platform/channel-metrics.js",
        "multi-platform/video-metrics.js",
    ],
}

async function main() {
    const selection = process.argv[2]
    const suites = selection ? [selection] : Object.keys(smokeSuites)
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
