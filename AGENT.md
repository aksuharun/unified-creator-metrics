# Project Context

This repository is building a unified multi-platform metrics library.

The goal is to expose one normalized API for basic public-facing metrics across platforms such as YouTube, Twitch, and Kick. Platform-specific clients handle authentication, provider SDKs, API quirks, and native response parsing. The multi-platform client composes those provider clients and routes normalized requests.

YouTube is the first working provider. It uses the official `googleapis` package and currently supports channel `followers`, which maps internally to YouTube `subscriberCount`.

The library is TypeScript-first. Source lives in `src/`, compiled output and generated declarations go to `dist/`, and package entry points should target `dist/`.

## Current Public API Shape

Direct provider usage:

```ts
const youtubeClient = createYoutubeClient({
  apiKey: process.env.YOUTUBE_API_KEY,
});

const metrics = await youtubeClient.channels.getMetrics({
  channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
  metrics: ["followers"],
});
```

Composed multi-platform usage:

```ts
const client = createMultiPlatformClient({
  youtube: youtubeClient,
});

const metrics = await client.channels.getMetrics({
  platform: "youtube",
  channelId: "UCGy9vOmYGW7quWUxJMQbvUg",
  metrics: ["followers"],
});
```

## Design Rules

- Keep normalized shared request and response types in `src/types.ts`.
- Keep provider-specific config, client aliases, and implementation details inside `src/providers/<platform>/`.
- Provider clients should accept normalized metric names, not native platform names.
- Native provider fields should be mapped internally. Example: YouTube `subscriberCount` becomes `followers`.
- Add new platforms incrementally. Prefer one complete vertical slice over broad scaffolding.
- Do not add provider-specific options to shared request types unless there is a proven need.
- Public methods and exported types should have concise JSDoc.

## Verification

Use:

```bash
npm run build
npm run smoke:youtube
```

The smoke command requires `YOUTUBE_API_KEY` and calls the live YouTube API.
