# Unified Creator Metrics

`Unified Creator Metrics` is a TypeScript library for normalized channel metrics, video metrics, and chat integrations across YouTube, Twitch, and Kick. Use provider clients directly when you need platform-native identifiers, or compose them with `createMultiPlatformClient()` when you want one routing surface.

## Features

- Create provider clients with `createYoutubeClient()`, `createTwitchClient()`, and `createKickClient()`
- Route requests through `createMultiPlatformClient()` with a `platform` field
- Resolve platform-native identities from a YouTube handle, Twitch login, or Kick slug
- Fetch normalized channel metrics: YouTube `followers` and `views`, Twitch `followers`
- Fetch normalized video metrics: YouTube `likes`, `views`, and `concurrentViewers`; Kick `concurrentViewers`
- Listen for chat messages through a common event API across YouTube, Twitch, and Kick
- Send chat messages through the library for YouTube and Kick, including multi-platform routing

## Prerequisites

- Node.js 18 or later
- YouTube read operations need `apiKey` unless you provide `accessToken` or `oauth2Client`; sending chat messages needs authenticated access
- Twitch needs `clientId` and `accessToken`; `channels.getMetrics()` requires a user token, and `chat.listen()` requires the `user:read:chat` scope
- Kick needs an `accessToken`; Kick chat listeners manage webhook subscriptions, and `subscription: "ensure"` requires a stable public `webhook.callbackUrl`

## Installation

From a checkout of this repository:

```bash
npm install
npm run build
```

## Usage

Resolve a provider-native identity first, then request normalized metrics through the composed client:

```js
import {
  createMultiPlatformClient,
  createYoutubeClient,
} from "unified-creator-metrics";

const youtube = createYoutubeClient({
  apiKey: process.env.YOUTUBE_API_KEY,
});

const client = createMultiPlatformClient({
  youtube,
});

const identity = await client.channels.resolve({
  platform: "youtube",
  handle: "@HARUN-AKSU",
});

const metrics = await client.channels.getMetrics({
  platform: "youtube",
  channelId: identity.channelId,
  metrics: ["followers", "views"],
});

console.log(metrics);
```

The same client can route platform-specific video metric requests:

```js
import {
  createKickClient,
  createMultiPlatformClient,
  createYoutubeClient,
} from "unified-creator-metrics";

const client = createMultiPlatformClient({
  kick: createKickClient({
    accessToken: process.env.KICK_APP_ACCESS_TOKEN,
  }),
  youtube: createYoutubeClient({
    apiKey: process.env.YOUTUBE_API_KEY,
  }),
});

const metrics = await client.videos.getMetrics([
  {
    platform: "kick",
    videoId: process.env.KICK_CHANNEL_SLUG,
    metrics: ["concurrentViewers"],
  },
  {
    platform: "youtube",
    videoId: process.env.YOUTUBE_VIDEO_ID,
    metrics: ["likes", "views", "concurrentViewers"],
  },
]);

console.log(metrics);
```

Chat listeners use the same event shape across providers. Sending chat messages through the library is available for YouTube and Kick; Twitch message sending is currently demonstrated in [`tests/manual/twitch/send-chat-message.js`](./tests/manual/twitch/send-chat-message.js) through a direct Helix API call.

## Test Layout

- [`tests/unit`](./tests/unit) contains fast isolated Vitest coverage for the library surface
- [`tests/smoke`](./tests/smoke) contains real-credential smoke checks for read-oriented provider flows
- [`tests/manual`](./tests/manual) contains listener and send-message scripts that are intentionally excluded from the automated smoke suite

## Contributing

- Fork the repository and create a branch for your change
- Run `npm run lint` and `npm test`
- Run `npm run test:smoke` when you need to verify live provider integrations
- Build with `npm run build` if you changed `src/`
- Open a pull request with the problem statement and the resulting behavior

## License

Distributed under the MIT License.
