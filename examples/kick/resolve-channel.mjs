import "dotenv/config"
import { createKickClient } from "@multi-platform-api/library"
import {
    getKickAppAccessToken,
    handleSmokeTestError,
    optionalEnv,
} from "../smoke-test-helpers.mjs"

async function main() {
    const accessToken = await getKickAppAccessToken()
    const kick = createKickClient({
        accessToken,
    })
    const slug = optionalEnv(
        "KICK_CHANNEL_SLUG",
        optionalEnv("KICK_BROADCASTER_USERNAME", "aksuharun"),
    )

    console.log("Resolving Kick channel identity...")
    console.log("KICK_CHANNEL_SLUG:", slug)

    const identity = await kick.channels.resolve({
        slug,
    })

    console.dir(identity, { depth: null })
}

main().catch((error) => {
    handleSmokeTestError("Kick channel resolve", error)
})
