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

    const channelId = optionalEnv("KICK_CHANNEL_SLUG", "westcol") // Westcol is a popular streamer on Kick

    console.log("Fetching Kick active streams for channel:", channelId)
    const active = await kick.livestreams.getActive({
        channelId,
    })
    console.log("Active streams:", active)
}

try {
    await main()
} catch (error) {
    handleSmokeTestError("Kick livestreams", error)
}
