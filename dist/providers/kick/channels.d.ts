import type { KickChannelsClient } from "./types.js";
export type KickChannelsClientOptions = {
    accessToken: string;
};
export declare function createKickChannelsClient(options: KickChannelsClientOptions): KickChannelsClient;
