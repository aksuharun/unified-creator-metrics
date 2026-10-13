import { google } from "googleapis";
export function createGoogleYoutubeAuthClient(config) {
    if (config.oauth2Client) {
        return config.oauth2Client;
    }
    if (!config.refreshToken && !config.accessToken) {
        return undefined;
    }
    const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
    let currentRefreshToken = config.refreshToken;
    oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
    });
    const onTokenUpdate = config.onTokenUpdate;
    if (onTokenUpdate) {
        oauth2Client.on("tokens", (tokens) => {
            const accessToken = tokens.access_token;
            if (!accessToken) {
                return;
            }
            currentRefreshToken = tokens.refresh_token ?? currentRefreshToken;
            void onTokenUpdate({
                accessToken,
                refreshToken: currentRefreshToken ?? "",
                expiresIn: typeof tokens.expiry_date === "number"
                    ? Math.max(Math.floor((tokens.expiry_date - Date.now()) / 1000), 0)
                    : null,
                expiresAt: typeof tokens.expiry_date === "number"
                    ? new Date(tokens.expiry_date).toISOString()
                    : null,
                scope: typeof tokens.scope === "string" ? tokens.scope : null,
                tokenType: typeof tokens.token_type === "string"
                    ? tokens.token_type
                    : null,
            });
        });
    }
    return oauth2Client;
}
/**
 * Create the official Google APIs YouTube client.
 */
export function createGoogleYoutubeClient(config) {
    const auth = createGoogleYoutubeAuthClient(config) ?? config.apiKey;
    return google.youtube({
        version: "v3",
        auth,
    });
}
