export { PlatformApiError, PlatformValidationError } from "./errors.js";
export { createKickClient } from "./kick.js";
export { createMultiPlatformClient } from "./multi-platform.js";
export { createTwitchClient } from "./twitch.js";
export { createGoogleYoutubeClient, createYoutubeClient } from "./youtube.js";
/**
 * Runtime constants for callers who prefer enum-like values over string literals.
 */
export const Platform = Object.freeze({
    YouTube: "youtube",
    Twitch: "twitch",
    Kick: "kick",
});
