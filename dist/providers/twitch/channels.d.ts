import type { TwitchChannelsClient } from "./types.js";
export type TwitchChannelsClientOptions = {
    clientId: string;
    accessToken: string;
};
export declare function createTwitchChannelsClient(options: TwitchChannelsClientOptions): TwitchChannelsClient;
