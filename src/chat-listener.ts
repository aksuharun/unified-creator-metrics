import type {
    ChatErrorHandler,
    ChatEventHandler,
    ChatListener,
    ChatMessage,
} from "./types.js"

/**
 * Small internal event emitter for provider chat listeners.
 *
 * Provider implementations own transport state while this base class owns
 * handler registration and safe callback dispatch.
 */
export class ChatListenerEmitter<
    TMessage extends ChatMessage,
    TStartResult = void,
> implements ChatListener<TMessage, TStartResult> {
    private readonly messageHandlers = new Set<ChatEventHandler<TMessage>>()
    private readonly errorHandlers = new Set<ChatErrorHandler>()

    /**
     * Register a message or error handler on the listener instance.
     */
    on(event: "message", handler: ChatEventHandler<TMessage>): this
    on(event: "error", handler: ChatErrorHandler): this
    on(
        event: "message" | "error",
        handler: ChatEventHandler<TMessage> | ChatErrorHandler,
    ): this {
        if (event === "message") {
            this.messageHandlers.add(handler as ChatEventHandler<TMessage>)
            return this
        }

        this.errorHandlers.add(handler as ChatErrorHandler)
        return this
    }

    /**
     * Remove a previously registered message or error handler.
     */
    off(event: "message", handler: ChatEventHandler<TMessage>): this
    off(event: "error", handler: ChatErrorHandler): this
    off(
        event: "message" | "error",
        handler: ChatEventHandler<TMessage> | ChatErrorHandler,
    ): this {
        if (event === "message") {
            this.messageHandlers.delete(handler as ChatEventHandler<TMessage>)
            return this
        }

        this.errorHandlers.delete(handler as ChatErrorHandler)
        return this
    }

    /**
     * Base implementation used by subclasses that do not need async startup.
     */
    async start(): Promise<TStartResult> {
        return undefined as TStartResult
    }

    /**
     * Base implementation used by subclasses that do not need async teardown.
     */
    async stop(): Promise<void> {
        // Stopping a listener should stop transport work, not unregister handlers.
    }

    /**
     * Emit a normalized message and route handler failures into `error`.
     */
    protected emitMessage(message: TMessage): void {
        for (const handler of this.messageHandlers) {
            try {
                const result = handler(message)

                if (isPromiseLike(result)) {
                    result.catch((error: unknown) => {
                        this.emitError(error)
                    })
                }
            } catch (error) {
                this.emitError(error)
            }
        }
    }

    /**
     * Emit an asynchronous error to registered observers.
     */
    protected emitError(error: unknown): void {
        for (const handler of this.errorHandlers) {
            try {
                const result = handler(error)

                if (isPromiseLike(result)) {
                    result.catch(() => {
                        // Error handlers are terminal observers; do not recurse.
                    })
                }
            } catch {
                // Error handlers are terminal observers; do not recurse.
            }
        }
    }
}

/**
 * Detect whether a handler returned a promise-like object.
 */
function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return (
        !!value &&
        typeof value === "object" &&
        "then" in value &&
        typeof value.then === "function"
    )
}
