# Unified Creator Metrics

This package is under active development. If you install it from npm, prefer the `next` dist-tag so you explicitly opt into the latest pre-release builds.

`Unified Creator Metrics` is a TypeScript library for normalized channel metrics, video metrics, and chat integrations across YouTube, Twitch, and Kick. Use provider clients directly when you need platform-native identifiers, or compose them with `createMultiPlatformClient()` when you want one routing surface.

## Features

- Create provider clients with `createYoutubeClient()`, `createTwitchClient()`, and `createKickClient()`
- Route requests through `createMultiPlatformClient()` with a `platform` field
- Resolve platform-native identities from a YouTube handle, Twitch login, or Kick slug
- Fetch normalized channel metrics: YouTube `followers` and `views`, Twitch `followers`
- Fetch normalized video metrics: YouTube `likes`, `views`, and `concurrentViewers`; Twitch `concurrentViewers`; Kick `concurrentViewers`
- Listen for chat messages through a common event API across YouTube, Twitch, and Kick
- Send chat messages through the library for YouTube and Kick, including multi-platform routing
- Moderate chat across YouTube, Twitch, and Kick with shared verbs: `deleteMessage`, `banUser`, `timeoutUser`, and `unbanUser`

## Prerequisites

- Node.js 18 or later
- YouTube read operations need `apiKey` unless you provide `accessToken`, `oauth2Client`, or a `refreshToken`; sending chat messages needs authenticated access
- Twitch needs `clientId`; use `appAccessToken` or `userAccessToken` for `channels.resolve()` and `videos.getMetrics()`, and `userAccessToken` or `userRefreshToken` for `channels.getMetrics()`, `chat.listen()` with `user:read:chat`, `chat.deleteMessage()` with `moderator:manage:chat_messages`, and `chat.banUser()` / `chat.timeoutUser()` / `chat.unbanUser()` with `moderator:manage:banned_users`
- Kick uses `appAccessToken` for `channels.resolve()`, `videos.getMetrics()`, and `chat.listen()`; use `userAccessToken` or `userRefreshToken` for `chat.sendMessage()` and all moderation methods
- Kick chat listeners manage webhook subscriptions, and `subscription: "ensure"` requires a stable public `webhook.callbackUrl`
- When you use `userRefreshToken` for Twitch or Kick, persist `onUserTokenUpdate()` results because refresh tokens may rotate

## Installation

From a checkout of this repository:

```bash
npm install
npm run build
```

To install the published prerelease:

```bash
npm install unified-creator-metrics@next
```

## Varlock + KeePassXC

This repository now includes a committed [`.env.schema`](./.env.schema) for the local smoke/manual scripts. Secret values are resolved through Varlock's KeePass plugin, and the schema file is the source of truth for local configuration.

The npm smoke/manual scripts resolve secrets through Varlock automatically. They also detect when they are already running under `varlock run`, so wrapping them manually will not trigger a second Varlock load.

Recommended local setup:

```bash
brew install dmno-dev/tap/varlock
varlock load
npm run test:smoke:youtube
```

Expected workflow:

- Provide `KP_PASSWORD` through your shell environment or a local env source that Varlock loads. Override `KP_DB_PATH` only when your KeePassXC database is not at the default path in [`.env.schema`](./.env.schema).
- Store KeePass entries with titles that match the secret variable names from [`.env.schema`](./.env.schema).
- Run secret-bearing npm scripts directly, or wrap them with `varlock run --no-inject-graph -- ...` if you need to supply an alternate Varlock entry point.
- Use `varlock scan` or `varlock scan --staged` before commits if you want an extra leak check.

Smoke-test credential expectations:

- YouTube read smoke tests use `YOUTUBE_API_KEY`; YouTube auth/chat smoke tests and manual YouTube write scripts use `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REFRESH_TOKEN`.
- Twitch smoke tests use `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REFRESH_TOKEN`; you do not need to provide `TWITCH_APP_ACCESS_TOKEN` or `TWITCH_USER_ACCESS_TOKEN`.
- Kick read smoke tests mint an app token from `KICK_CLIENT_ID` and `KICK_CLIENT_SECRET`; Kick auth smoke tests use `KICK_REFRESH_TOKEN` and no manually supplied access token.

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
  createTwitchClient,
  createYoutubeClient,
} from "unified-creator-metrics";

const client = createMultiPlatformClient({
  kick: createKickClient({
    appAccessToken: process.env.KICK_APP_ACCESS_TOKEN,
  }),
  twitch: createTwitchClient({
    clientId: process.env.TWITCH_CLIENT_ID,
    userAccessToken: process.env.TWITCH_USER_ACCESS_TOKEN,
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
    platform: "twitch",
    videoId: process.env.TWITCH_BROADCASTER_ID,
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

For livestream metrics, `videoId` is the platform-specific lookup key for the active stream. That means a YouTube video id, a Twitch broadcaster id, or a Kick channel slug.

When one provider needs both token kinds, pass both into the same client:

```js
import { createKickClient } from "unified-creator-metrics";

const kick = createKickClient({
  appAccessToken: process.env.KICK_APP_ACCESS_TOKEN,
  userAccessToken: process.env.KICK_USER_ACCESS_TOKEN,
});
```

You can also let the library obtain and refresh user access tokens from a stored refresh token:

```js
import {
  createKickClient,
  createTwitchClient,
  createYoutubeClient,
} from "unified-creator-metrics";

const youtube = createYoutubeClient({
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
});

const twitch = createTwitchClient({
  clientId: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
  userRefreshToken: process.env.TWITCH_REFRESH_TOKEN,
  onUserTokenUpdate(tokens) {
    console.log("Persist refreshed Twitch tokens:", tokens);
  },
});

const kick = createKickClient({
  appAccessToken: process.env.KICK_APP_ACCESS_TOKEN,
  clientId: process.env.KICK_CLIENT_ID,
  clientSecret: process.env.KICK_CLIENT_SECRET,
  userRefreshToken: process.env.KICK_REFRESH_TOKEN,
  onUserTokenUpdate(tokens) {
    console.log("Persist refreshed Kick tokens:", tokens);
  },
});
```

If you want to refresh tokens manually, the package also exports `refreshYoutubeAccessToken()`, `refreshTwitchAccessToken()`, and `refreshKickAccessToken()`.

Chat listeners use the same event shape across providers. Sending chat messages through the library is available for YouTube, Twitch, and Kick.

Moderation is available on every provider client and through `createMultiPlatformClient().chats` with the same verbs:

```js
const result = await twitch.chat.deleteMessage({
  broadcasterId: "1234",
  messageId: "abc-123",
});

await kick.chat.timeoutUser({
  broadcasterUserId: 1234,
  userId: 9876,
  durationSeconds: 120,
  reason: "Sensitive information",
});

const ban = await youtube.chat.banUser({
  liveChatId: "Cg0KC2xpdmUtY2hhdC0x",
  userId: "UC1234567890",
});

await youtube.chat.unbanUser({
  banId: ban.banId,
});
```

The multi-platform router exposes the same moderation verbs:

```js
await client.chats.deleteMessage({
  platform: "twitch",
  broadcasterId: "1234",
  messageId: "abc-123",
});

await client.chats.banUser({
  platform: "youtube",
  liveChatId: "Cg0KC2xpdmUtY2hhdC0x",
  userId: "UC1234567890",
});
```

Notes:

- `message.id` from listener events feeds `deleteMessage()`
- `message.author.id` feeds `userId` for `banUser()` and `timeoutUser()`
- YouTube moderation also needs the active `liveChatId` from `listener.start()`
- `unbanUser()` keeps the same verb everywhere, but YouTube needs the returned `banId` while Twitch and Kick unban by `userId`
- Kick timeouts are normalized to `durationSeconds`, but the provider only accepts whole-minute durations

## Test Layout

- [`tests/unit`](./tests/unit) contains fast isolated Vitest coverage for the library surface
- [`tests/smoke`](./tests/smoke) contains real-credential smoke checks for read-oriented provider flows
- [`tests/smoke`](./tests/smoke) also includes an opt-in `chat` suite that sends a test message, reads it through the chat listener, and deletes it after a short delay where supported
- [`tests/smoke`](./tests/smoke) also includes an opt-in `moderation` suite that exercises `sendMessage()`, `deleteMessage()`, `banUser()`, `timeoutUser()`, and `unbanUser()` through the exported library clients instead of raw provider requests
- [`tests/manual`](./tests/manual) contains listener and send-message scripts that are intentionally excluded from the automated smoke suite

## Contributing

- Fork the repository and create a branch for your change
- Run `npm run lint` and `npm test`
- Run `npm run test:smoke` when you need to verify live provider integrations
- Run `npm run test:smoke:chat` when you want to verify live chat send/read/delete behavior; it sends and deletes live chat messages and is excluded from the default smoke run
- Run `npm run test:smoke:chat:youtube`, `npm run test:smoke:chat:twitch`, or `npm run test:smoke:chat:kick` when only one provider has an available live chat fixture
- Run `npm run test:smoke:auth` when you want to verify refresh-token integrations with real credentials
- Run `npm run test:smoke:moderation` only when you have dedicated moderation fixtures; it mutates live chat state and is excluded from the default smoke run
- Build with `npm run build` if you changed `src/`
- Open a pull request with the problem statement and the resulting behavior

The auth smoke suite is opt-in and expects real refresh-token credentials:

- YouTube: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
- Twitch: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REFRESH_TOKEN`
- Kick: `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`, `KICK_REFRESH_TOKEN`
  `KICK_BROADCASTER_USER_ID` is optional when `KICK_CHANNEL_SLUG` or `KICK_BROADCASTER_USERNAME` can be resolved.

The chat smoke suite is opt-in and expects active live chat fixtures:

- YouTube: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, plus `YOUTUBE_LIVE_CHAT_ID` or `YOUTUBE_LIVE_VIDEO_ID`
- Twitch: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REFRESH_TOKEN`, and `TWITCH_BROADCASTER_ID` or `TWITCH_BROADCASTER_LOGIN`. The refresh token must cover `user:read:chat`, `user:write:chat`, and `moderator:manage:chat_messages`.
- Kick: `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`, `KICK_REFRESH_TOKEN`, `KICK_WEBHOOK_CALLBACK_URL`, and `KICK_BROADCASTER_USER_ID` or resolvable `KICK_CHANNEL_SLUG`. The callback URL must route to the local `PORT` and `KICK_WEBHOOK_PATH` used by the smoke script.
- Optional timing controls: `CHAT_SMOKE_TIMEOUT_MS`, `CHAT_DELETE_DELAY_MS`

The moderation smoke suite additionally expects dedicated fixture targets:

- YouTube: `YOUTUBE_MODERATION_USER_ID`, plus `YOUTUBE_LIVE_CHAT_ID` or `YOUTUBE_LIVE_VIDEO_ID`
- Twitch: `TWITCH_MODERATION_USER_ID` and `TWITCH_DELETE_MESSAGE_ID`
- Kick: `KICK_MODERATION_USER_ID`

## Publishing

1. Make sure `npm test` and `npm run build` pass.
2. Bump the version with a prerelease identifier when you want to ship changes early, for example:

```bash
npm version prerelease --preid=next
```

3. Publish to npm:

```bash
npm publish
```

The package is configured to publish with the `next` dist-tag by default, so consumers must opt in to pre-release updates.

## License

Distributed under the MIT License.
