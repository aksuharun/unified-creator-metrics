import type { KickVideosClient } from "./types.js";
export type KickVideosClientOptions = {
    accessToken: string;
};
export declare function createKickVideosClient(options: KickVideosClientOptions): KickVideosClient;
