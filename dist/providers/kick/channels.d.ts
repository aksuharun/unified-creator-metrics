import type { KickChannelsClient } from "./types.js";
export type KickChannelsClientOptions = {
    appAccessToken?: string;
};
export declare function createKickChannelsClient(options: KickChannelsClientOptions): KickChannelsClient;
