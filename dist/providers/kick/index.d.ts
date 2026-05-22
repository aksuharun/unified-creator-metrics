import type { KickClient, KickClientConfig } from "./types.js";
/**
 * Create a Kick provider client.
 *
 * Kick currently exposes livestream `viewer_count` publicly, which is
 * normalized to `concurrentViewers`.
 */
export declare function createKickClient(config: KickClientConfig): KickClient;
