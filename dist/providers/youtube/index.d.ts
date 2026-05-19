import { type GoogleYoutubeClient } from "./google-client.js";
import type { YoutubeClient, YoutubeClientConfig } from "./types.js";
export type { GoogleYoutubeClient };
/**
 * Create a YouTube provider client.
 *
 * This client uses normalized metric names. For example, request `followers`
 * even though YouTube calls the value `subscriberCount`.
 */
export declare function createYoutubeClient(config: YoutubeClientConfig): YoutubeClient;
export { createGoogleYoutubeClient } from "./google-client.js";
