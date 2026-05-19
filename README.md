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

YouTube video and livestream metrics are exposed through `videos.getMetrics()`:

```js
const videoMetrics = await client.videos.getMetrics({
  platform: "youtube",
  videoId: "dQw4w9WgXcQ",
  metrics: ["likes", "views", "concurrentViewers"],
});
```

See [examples](./examples) for runnable YouTube and multi-platform client usage.
