# Multi-Platform API Library

Unified JavaScript client for public-facing platform metrics across services such as YouTube, Twitch, and Kick.

The intended API uses provider-specific clients for authentication and platform details, then composes them into a multi-platform client when callers need one normalized surface:

```js
import {
  createMultiPlatformClient,
  createYoutubeClient,
} from "@multi-platform-api/library";

const youtubeClient = createYoutubeClient({
  apiKey: process.env.YOUTUBE_API_KEY,
});

const client = createMultiPlatformClient({
  youtube: youtubeClient,
});

const metrics = await client.channels.getMetrics({
  platform: "youtube",
  channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
  metrics: ["followers", "views"],
});
```

YouTube channel metrics currently support public `followers` and `views`.
Twitch channel metrics currently support `followers`.

Resolve the provider-specific channel identity you need before calling metrics
or chat methods:

```js
const youtubeIdentity = await youtubeClient.channels.resolve({
  handle: "@HARUN-AKSU",
});

console.log(youtubeIdentity.channelId);
```

Kick exposes the same capability through `channels.resolve()` using the
platform-native slug:

```js
import { createKickClient } from "@multi-platform-api/library";

const kickClient = createKickClient({
  accessToken: process.env.KICK_APP_ACCESS_TOKEN,
});

const kickIdentity = await kickClient.channels.resolve({
  slug: "aksuharun",
});

console.log(kickIdentity.broadcasterUserId);
```

Twitch uses the same pattern with a broadcaster login:

```js
import { createTwitchClient } from "@multi-platform-api/library";

const twitchClient = createTwitchClient({
  clientId: process.env.TWITCH_CLIENT_ID,
  accessToken: process.env.TWITCH_APP_ACCESS_TOKEN,
});

const twitchIdentity = await twitchClient.channels.resolve({
  login: "aksuharun",
});

console.log(twitchIdentity.broadcasterId);
```

After resolving the broadcaster ID, fetch the follower count with
`channels.getMetrics()`:

```js
import { createTwitchClient } from "@multi-platform-api/library";

const twitchClient = createTwitchClient({
  clientId: process.env.TWITCH_CLIENT_ID,
  accessToken: process.env.TWITCH_USER_ACCESS_TOKEN,
});

const metrics = await twitchClient.channels.getMetrics({
  channelId: process.env.TWITCH_BROADCASTER_ID,
  metrics: ["followers"],
});

console.log(metrics.followers);
```

The Twitch Helix `GET /helix/channels/followers` endpoint uses a user access
token. See Twitch's official reference:
[Get Channel Followers](https://dev.twitch.tv/docs/api/reference#get-channel-followers).

When using the composed client, route the lookup by `platform`:

```js
const identity = await client.channels.resolve({
  platform: "youtube",
  handle: "@HARUN-AKSU",
});
```

YouTube video and livestream metrics are exposed through `videos.getMetrics()`:

```js
const videoMetrics = await client.videos.getMetrics({
  platform: "youtube",
  videoId: "dQw4w9WgXcQ",
  metrics: ["likes", "views", "concurrentViewers"],
});
```

See [examples](./examples) for runnable usage grouped by platform:
`examples/youtube`, `examples/twitch`, `examples/kick`, and
`examples/multi-platform`.

## Chat message events

Provider clients expose chat listeners with the same consumer-facing event
syntax, even though Twitch uses EventSub WebSockets, Kick uses webhooks, and
YouTube uses polling internally.

When you want one listener across providers, use the multi-platform client:

```js
import {
  createKickClient,
  createMultiPlatformClient,
  createYoutubeClient,
} from "@multi-platform-api/library";

const client = createMultiPlatformClient({
  kick: createKickClient({
    accessToken: process.env.KICK_USER_ACCESS_TOKEN,
  }),
  youtube: createYoutubeClient({
    apiKey: process.env.YOUTUBE_API_KEY,
  }),
});

const chat = client.chats.listen([
  {
    platform: "kick",
    broadcasterUserId: Number(process.env.KICK_BROADCASTER_USER_ID),
    subscription: "ensure",
    webhook: {
      callbackUrl: process.env.KICK_WEBHOOK_CALLBACK_URL,
    },
  },
  {
    platform: "youtube",
    liveVideoId: process.env.YOUTUBE_LIVE_VIDEO_ID,
    includeHistory: false,
  },
]);

chat.on("message", (message) => {
  console.log(`[${message.platform}] ${message.author.displayName}: ${message.text}`);
});

chat.on("error", console.error);

await chat.start();
```

Kick setup manages the remote `chat.message.sent` event subscription and leaves
the HTTP server under your control:

```js
import { createServer } from "node:http";
import { createKickClient } from "@multi-platform-api/library";

const kick = createKickClient({
  accessToken: process.env.KICK_USER_ACCESS_TOKEN,
});

const chat = kick.chat.listen({
  broadcasterUserId: Number(process.env.KICK_BROADCASTER_USER_ID),
  subscription: "ensure",
  webhook: {
    callbackUrl: process.env.KICK_WEBHOOK_CALLBACK_URL,
  },
});

chat.on("message", (message) => {
  console.log(`[kick] ${message.author.displayName}: ${message.text}`);
});

chat.on("error", console.error);

await chat.start();

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/kick/webhook") {
    await chat.handleNodeWebhook(req);
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}).listen(8090);
```

Use `subscription: "ensure"` only when you can provide the stable public
webhook URL through `webhook.callbackUrl`. For rotating tunnel URLs, prefer
`subscription: "create"` so the listener does not reuse a remote subscription
that still points to an older endpoint.

YouTube chat uses the same listener shape and polls the live chat endpoint:

```js
const youtubeChat = youtubeClient.chat.listen({
  liveVideoId: process.env.YOUTUBE_LIVE_VIDEO_ID,
  includeHistory: false,
});

youtubeChat.on("message", handleMessage);
youtubeChat.on("error", console.error);

await youtubeChat.start();
```

Twitch chat uses the same listener shape and manages the EventSub WebSocket
subscription internally:

```js
const twitchChat = twitchClient.chat.listen({
  broadcasterId: process.env.TWITCH_BROADCASTER_ID,
});

twitchChat.on("message", handleMessage);
twitchChat.on("error", console.error);

await twitchChat.start();
```

For multi-platform webhook delivery, pass the incoming Kick request to the
composed listener:

```js
await chat.handleNodeWebhook(req);
```

## Sending chat messages

Provider clients send chat messages through request objects, matching the rest
of the library API:

```js
await youtubeClient.chat.sendMessage({
  liveChatId: process.env.YOUTUBE_LIVE_CHAT_ID,
  text: "Hello YouTube chat",
});

await kick.chat.sendMessage({
  broadcasterUserId: Number(process.env.KICK_BROADCASTER_USER_ID),
  text: "Hello Kick chat",
});
```

The multi-platform client routes by `platform` and keeps provider-specific
destination fields explicit:

```js
await client.chats.sendMessage({
  platform: "youtube",
  liveChatId: process.env.YOUTUBE_LIVE_CHAT_ID,
  text: "Hello YouTube chat",
});

await client.chats.sendMessage({
  platform: "kick",
  broadcasterUserId: Number(process.env.KICK_BROADCASTER_USER_ID),
  text: "Hello Kick chat",
});
```

Smoke-test the real provider integrations with:

```bash
npm run smoke:youtube:resolve-channel
npm run smoke:youtube:channel-metrics
npm run smoke:youtube:video-metrics
npm run smoke:youtube:chat-listener
npm run smoke:youtube:send-chat-message
npm run smoke:kick:resolve-channel
npm run smoke:kick:concurrent-viewers
npm run smoke:kick:chat-listener
npm run smoke:kick:send-chat-message
npm run smoke:twitch:resolve-channel
npm run smoke:twitch:channel-metrics
npm run smoke:twitch:concurrent-viewers
npm run smoke:twitch:chat-listener
npm run smoke:twitch:send-chat-message
npm run smoke:multi-platform:channel-metrics
npm run smoke:multi-platform:video-metrics
npm run smoke:multi-platform:chat-listener
npm run smoke:multi-platform:send-chat-message
```

YouTube metric and listener smoke tests require `YOUTUBE_API_KEY`; YouTube send
resolve smoke tests require `YOUTUBE_API_KEY` and optionally
`YOUTUBE_CHANNEL_HANDLE`. YouTube send message smoke tests require
`YOUTUBE_ACCESS_TOKEN` and either
`YOUTUBE_LIVE_CHAT_ID` or `YOUTUBE_LIVE_VIDEO_ID`. Kick metric smoke tests use
`KICK_APP_ACCESS_TOKEN` when present, otherwise `KICK_CLIENT_ID` and
`KICK_CLIENT_SECRET` to mint one; Kick resolve smoke tests optionally accept
`KICK_CHANNEL_SLUG` or `KICK_BROADCASTER_USERNAME`. Kick send message and
listener smoke tests require `KICK_USER_ACCESS_TOKEN` and, when
`KICK_CHAT_TYPE` is unset or `user`, `KICK_BROADCASTER_USER_ID`. Kick listener
smoke tests default to `subscription: "create"` unless
`KICK_WEBHOOK_CALLBACK_URL` is set, in which case they default to
`subscription: "ensure"`. Twitch resolve
smoke tests require `TWITCH_CLIENT_ID`, `TWITCH_APP_ACCESS_TOKEN`, and
optionally `TWITCH_BROADCASTER_LOGIN`. Twitch channel metric smoke tests
require `TWITCH_CLIENT_ID`, `TWITCH_USER_ACCESS_TOKEN`, and either
`TWITCH_BROADCASTER_ID` or `TWITCH_BROADCASTER_LOGIN`. Twitch concurrent viewer
smoke tests require `TWITCH_CLIENT_ID`, `TWITCH_APP_ACCESS_TOKEN`, and either
`TWITCH_BROADCASTER_ID` or `TWITCH_BROADCASTER_LOGIN`. Twitch chat listener
smoke tests require `TWITCH_CLIENT_ID`, `TWITCH_USER_ACCESS_TOKEN`, and either
`TWITCH_BROADCASTER_ID` or `TWITCH_BROADCASTER_LOGIN`; they also verify that
the user token includes `user:read:chat`. Twitch send message smoke tests
require `TWITCH_CLIENT_ID`, `TWITCH_USER_ACCESS_TOKEN`, and either
`TWITCH_BROADCASTER_ID` or `TWITCH_BROADCASTER_LOGIN`; they also verify that
the user token includes `user:write:chat`, optionally accept
`TWITCH_REPLY_PARENT_MESSAGE_ID`, and currently call the Twitch Helix API
directly because `twitch.chat.sendMessage()` is not implemented in the library
yet. Message smoke tests accept optional text overrides through
`YOUTUBE_CHAT_MESSAGE`, `KICK_CHAT_MESSAGE`, and `TWITCH_CHAT_MESSAGE`. The
multi-platform send message smoke test defaults to YouTube; set
`CHAT_PLATFORM=kick` to route it to Kick instead.
