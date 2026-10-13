import type { KickLivestreamsClient } from "./types.js";
export type KickLivestreamsClientOptions = {
    appAccessToken?: string;
};
export declare function createKickLivestreamsClient(options: KickLivestreamsClientOptions): KickLivestreamsClient;
