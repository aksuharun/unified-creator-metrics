import { PlatformApiError } from "../../errors.js";
import type { GoogleYoutubeClient } from "./google-client.js";
export type YoutubeLiveChatMessage = {
    id?: string | null;
    snippet?: {
        type?: string | number | null;
        publishedAt?: string | null;
        textMessageDetails?: {
            messageText?: string | null;
        } | null;
    } | null;
    authorDetails?: {
        channelId?: string | null;
        channelUrl?: string | null;
        displayName?: string | null;
    } | null;
};
export type YoutubeLiveChatMessagesPayload = {
    items?: YoutubeLiveChatMessage[];
    nextPageToken?: string | null;
    pollingIntervalMillis?: number | null;
    offlineAt?: string | null;
};
type YoutubeChatStreamRequest = {
    liveChatId: string;
};
export type YoutubeChatStream = {
    messages: AsyncIterable<YoutubeLiveChatMessagesPayload>;
    close(): void;
};
/**
 * Open YouTube's documented gRPC stream using the existing Google client auth.
 */
export declare function createYoutubeChatStream(youtubeApiClient: GoogleYoutubeClient, request: YoutubeChatStreamRequest): Promise<YoutubeChatStream>;
/**
 * Map gRPC failures to the library's HTTP-style provider error context.
 */
export declare function normalizeYoutubeChatStreamError(error: unknown): PlatformApiError;
/**
 * Reconnect only after transient transport or rate-limit failures.
 */
export declare function isRetryableYoutubeChatStreamError(error: unknown): boolean;
export {};
