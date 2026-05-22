import { google } from "googleapis";
/**
 * Create the official Google APIs YouTube client.
 */
export function createGoogleYoutubeClient(config) {
    let auth = config.apiKey;
    if (config.oauth2Client) {
        auth = config.oauth2Client;
    }
    else if (config.accessToken) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: config.accessToken });
        auth = oauth2Client;
    }
    return google.youtube({
        version: "v3",
        auth,
    });
}
