import "dotenv/config"
import { createKickClient } from "unified-creator-metrics"
import {
    getKickAppAccessToken,
    handleSmokeTestError,
    optionalEnv,
} from "../helpers.js"

async function main() {
    const accessToken = await getKickAppAccessToken()
    const kick = createKickClient({
        appAccessToken: accessToken,
    })
    const metrics = await kick.videos.getMetrics({
        videoId: optionalEnv("KICK_CHANNEL_SLUG", "aksuharun"),
        metrics: ["concurrentViewers"],
    })

    console.log(metrics)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Kick concurrent viewers", error)
}
