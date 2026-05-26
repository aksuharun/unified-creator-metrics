import { ChatListenerEmitter } from "./chat-listener.js";
import { PlatformValidationError } from "./errors.js";
/**
 * Create a client that routes normalized requests to provider-specific clients.
 *
 * The multi-platform client does not own provider credentials. It composes
 * provider clients that can also be used directly.
 */
export function createMultiPlatformClient(config) {
    if (!config || typeof config !== "object") {
        throw new PlatformValidationError("Multi-platform client config is required.");
    }
    const providers = {
        youtube: config.youtube,
        twitch: config.twitch,
        kick: config.kick,
    };
    return {
        channels: createMultiPlatformChannelsClient(providers),
        videos: createMultiPlatformVideosClient(providers),
        chats: createMultiPlatformChatsClient(providers),
    };
}
function createMultiPlatformChannelsClient(providers) {
    async function resolve(request) {
        return dispatchChannelResolve(request, providers);
    }
    function getMetrics(request) {
        if (isChannelMetricsBatchRequest(request)) {
            return Promise.all(request.map((item) => dispatchChannelMetrics(item, providers)));
        }
        return dispatchChannelMetrics(request, providers);
    }
    return { resolve, getMetrics };
}
function createMultiPlatformVideosClient(providers) {
    function getMetrics(request) {
        if (isVideoMetricsBatchRequest(request)) {
            return Promise.all(request.map((item) => dispatchVideoMetrics(item, providers)));
        }
        return dispatchVideoMetrics(request, providers);
    }
    return { getMetrics };
}
function createMultiPlatformChatsClient(providers) {
    function listen(request) {
        const requests = Array.isArray(request) ? request : [request];
        return new MultiPlatformChatListenerImpl(requests.map((item) => createChatSubscription(item, providers)));
    }
    async function sendMessage(request) {
        return dispatchSendMessage(request, providers);
    }
    async function deleteMessage(request) {
        return dispatchDeleteMessage(request, providers);
    }
    async function banUser(request) {
        return dispatchBanUser(request, providers);
    }
    async function timeoutUser(request) {
        return dispatchTimeoutUser(request, providers);
    }
    async function unbanUser(request) {
        return dispatchUnbanUser(request, providers);
    }
    return { listen, sendMessage, deleteMessage, banUser, timeoutUser, unbanUser };
}
function isChannelMetricsBatchRequest(request) {
    return Array.isArray(request);
}
function isVideoMetricsBatchRequest(request) {
    return Array.isArray(request);
}
function dispatchChannelResolve(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel resolve request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.channels.resolve({
            handle: request.handle,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.channels.resolve({
            login: request.login,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "kick") {
        const provider = providers.kick;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.channels.resolve({
            slug: request.slug,
            includeRaw: request.includeRaw,
        });
    }
    throw new PlatformValidationError(`Channel resolve is not supported for platform "${String(request.platform)}".`, { platform: String(request.platform) });
}
function dispatchChannelMetrics(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Channel metrics request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.channels.getMetrics({
            channelId: request.channelId,
            metrics: request.metrics,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.channels.getMetrics({
            channelId: request.channelId,
            metrics: request.metrics,
            includeRaw: request.includeRaw,
        });
    }
    throw new PlatformValidationError(`Channel metrics are not supported for platform "${String(request.platform)}".`, { platform: String(request.platform) });
}
function createChatSubscription(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Chat listen request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return {
            platform: "youtube",
            listener: provider.chat.listen({
                liveVideoId: request.liveVideoId,
                liveChatId: request.liveChatId,
                pollingIntervalMs: request.pollingIntervalMs,
                maxResults: request.maxResults,
                includeHistory: request.includeHistory,
                maxRecentMessageIds: request.maxRecentMessageIds,
                includeRaw: request.includeRaw,
            }),
        };
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return {
            platform: "twitch",
            listener: provider.chat.listen({
                broadcasterId: request.broadcasterId,
                includeRaw: request.includeRaw,
                maxRecentMessageIds: request.maxRecentMessageIds,
                websocketUrl: request.websocketUrl,
                keepaliveTimeoutSeconds: request.keepaliveTimeoutSeconds,
            }),
        };
    }
    const provider = providers.kick;
    if (!provider) {
        throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
    }
    return {
        platform: "kick",
        listener: provider.chat.listen({
            broadcasterUserId: request.broadcasterUserId,
            includeRaw: request.includeRaw,
            maxRecentMessageIds: request.maxRecentMessageIds,
            subscription: request.subscription,
            webhook: request.webhook,
        }),
    };
}
function dispatchVideoMetrics(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Video metrics request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.videos.getMetrics({
            videoId: request.videoId,
            metrics: request.metrics,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.videos.getMetrics({
            videoId: request.videoId,
            metrics: request.metrics,
            includeRaw: request.includeRaw,
        });
    }
    const provider = providers.kick;
    if (!provider) {
        throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
    }
    return provider.videos.getMetrics({
        videoId: request.videoId,
        metrics: request.metrics,
        includeRaw: request.includeRaw,
    });
}
function dispatchSendMessage(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Send message request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.sendMessage({
            liveChatId: request.liveChatId,
            text: request.text,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "kick") {
        const provider = providers.kick;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        if (request.type === "bot") {
            return provider.chat.sendMessage({
                type: request.type,
                text: request.text,
                includeRaw: request.includeRaw,
            });
        }
        return provider.chat.sendMessage({
            type: request.type,
            broadcasterUserId: request.broadcasterUserId,
            text: request.text,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.sendMessage({
            broadcasterId: request.broadcasterId,
            text: request.text,
            replyParentMessageId: request.replyParentMessageId,
            includeRaw: request.includeRaw,
        });
    }
    throw new PlatformValidationError(`Chat messages are not supported for platform "${String(request.platform)}".`, { platform: String(request.platform) });
}
function dispatchDeleteMessage(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Delete message request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.deleteMessage({
            messageId: request.messageId,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.deleteMessage({
            broadcasterId: request.broadcasterId,
            messageId: request.messageId,
            includeRaw: request.includeRaw,
        });
    }
    const provider = providers.kick;
    if (!provider) {
        throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
    }
    return provider.chat.deleteMessage({
        messageId: request.messageId,
        includeRaw: request.includeRaw,
    });
}
function dispatchBanUser(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Ban user request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.banUser({
            liveChatId: request.liveChatId,
            userId: request.userId,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.banUser({
            broadcasterId: request.broadcasterId,
            userId: request.userId,
            reason: request.reason,
            includeRaw: request.includeRaw,
        });
    }
    const provider = providers.kick;
    if (!provider) {
        throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
    }
    return provider.chat.banUser({
        broadcasterUserId: request.broadcasterUserId,
        userId: request.userId,
        reason: request.reason,
        includeRaw: request.includeRaw,
    });
}
function dispatchTimeoutUser(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Timeout user request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.timeoutUser({
            liveChatId: request.liveChatId,
            userId: request.userId,
            durationSeconds: request.durationSeconds,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.timeoutUser({
            broadcasterId: request.broadcasterId,
            userId: request.userId,
            durationSeconds: request.durationSeconds,
            reason: request.reason,
            includeRaw: request.includeRaw,
        });
    }
    const provider = providers.kick;
    if (!provider) {
        throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
    }
    return provider.chat.timeoutUser({
        broadcasterUserId: request.broadcasterUserId,
        userId: request.userId,
        durationSeconds: request.durationSeconds,
        reason: request.reason,
        includeRaw: request.includeRaw,
    });
}
function dispatchUnbanUser(request, providers) {
    if (!request || typeof request !== "object") {
        throw new PlatformValidationError("Unban user request is required.");
    }
    if (request.platform === "youtube") {
        const provider = providers.youtube;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.unbanUser({
            banId: request.banId,
            includeRaw: request.includeRaw,
        });
    }
    if (request.platform === "twitch") {
        const provider = providers.twitch;
        if (!provider) {
            throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
        }
        return provider.chat.unbanUser({
            broadcasterId: request.broadcasterId,
            userId: request.userId,
            includeRaw: request.includeRaw,
        });
    }
    const provider = providers.kick;
    if (!provider) {
        throw new PlatformValidationError(`No provider client was configured for platform "${request.platform}".`, { platform: request.platform });
    }
    return provider.chat.unbanUser({
        broadcasterUserId: request.broadcasterUserId,
        userId: request.userId,
        includeRaw: request.includeRaw,
    });
}
class MultiPlatformChatListenerImpl extends ChatListenerEmitter {
    subscriptions;
    constructor(subscriptions) {
        super();
        this.subscriptions = subscriptions;
        for (const subscription of subscriptions) {
            if (subscription.platform === "youtube") {
                subscription.listener.on("message", (message) => {
                    this.emitMessage(message);
                });
                subscription.listener.on("error", (error) => {
                    this.emitError(error);
                });
                continue;
            }
            if (subscription.platform === "twitch") {
                subscription.listener.on("message", (message) => {
                    this.emitMessage(message);
                });
                subscription.listener.on("error", (error) => {
                    this.emitError(error);
                });
                continue;
            }
            subscription.listener.on("message", (message) => {
                this.emitMessage(message);
            });
            subscription.listener.on("error", (error) => {
                this.emitError(error);
            });
        }
    }
    async start() {
        const results = await Promise.allSettled(this.subscriptions.map((subscription) => {
            return this.startSubscription(subscription);
        }));
        const rejectedResult = results.find((item) => item.status === "rejected");
        if (rejectedResult) {
            await this.cleanupStartedSubscriptions(results);
            throw rejectedResult.reason;
        }
        const startedSubscriptions = [];
        for (const result of results) {
            if (result.status === "fulfilled") {
                startedSubscriptions.push(result.value);
            }
        }
        return startedSubscriptions;
    }
    async stop(options = {}) {
        await Promise.all(this.subscriptions.map((subscription) => {
            return this.stopSubscription(subscription, options);
        }));
    }
    async handleWebhook(request) {
        const listeners = this.getKickSubscriptions();
        if (listeners.length === 0) {
            throw new PlatformValidationError("No Kick chat listeners were configured for webhook handling.", { platform: "kick" });
        }
        const results = await Promise.all(listeners.map(async (subscription) => ({
            platform: subscription.platform,
            result: await subscription.listener.handleWebhook(request),
        })));
        return results;
    }
    async handleNodeWebhook(request) {
        return this.handleWebhook({
            headers: request.headers,
            rawBody: await readRawBody(request),
        });
    }
    getKickSubscriptions() {
        return this.subscriptions.filter((subscription) => {
            return subscription.platform === "kick";
        });
    }
    async startSubscription(subscription) {
        if (subscription.platform === "youtube") {
            const result = await subscription.listener.start();
            return {
                platform: subscription.platform,
                liveChatId: result.liveChatId,
                liveVideoId: result.liveVideoId,
            };
        }
        if (subscription.platform === "twitch") {
            const result = await subscription.listener.start();
            return {
                platform: subscription.platform,
                broadcasterId: result.broadcasterId,
                sessionId: result.sessionId,
                userId: result.userId,
                subscriptions: result.subscriptions,
            };
        }
        const result = await subscription.listener.start();
        return {
            platform: subscription.platform,
            subscriptions: result.subscriptions,
        };
    }
    async stopSubscription(subscription, options) {
        if (subscription.platform === "twitch") {
            await subscription.listener.stop(options.twitch);
            return;
        }
        if (subscription.platform === "kick") {
            await subscription.listener.stop(options.kick);
            return;
        }
        await subscription.listener.stop();
    }
    async cleanupStartedSubscriptions(results) {
        await Promise.all(results.map((result, index) => {
            if (result.status !== "fulfilled") {
                return Promise.resolve();
            }
            return this.stopSubscription(this.subscriptions[index], {
                twitch: { unsubscribe: true },
                kick: { unsubscribe: true },
            });
        }));
    }
}
async function readRawBody(request) {
    const decoder = new TextDecoder();
    let rawBody = "";
    for await (const chunk of request) {
        rawBody +=
            typeof chunk === "string"
                ? chunk
                : decoder.decode(chunk, { stream: true });
    }
    return rawBody + decoder.decode();
}
