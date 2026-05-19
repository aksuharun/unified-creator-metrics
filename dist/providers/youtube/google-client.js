import { google } from "googleapis";
/**
 * Create the official Google APIs YouTube client.
 */
export function createGoogleYoutubeClient(config) {
    return google.youtube({
        version: "v3",
        auth: config.apiKey,
    });
}
