import type { KickVideosClient } from "./types.js";
export type KickVideosClientOptions = {
    appAccessToken?: string;
};
export declare function createKickVideosClient(options: KickVideosClientOptions): KickVideosClient;
