/**
 * Small internal event emitter for provider chat listeners.
 *
 * Provider implementations own transport state while this base class owns
 * handler registration and safe callback dispatch.
 */
export class ChatListenerEmitter {
    messageHandlers = new Set();
    errorHandlers = new Set();
    on(event, handler) {
        if (event === "message") {
            this.messageHandlers.add(handler);
            return this;
        }
        this.errorHandlers.add(handler);
        return this;
    }
    off(event, handler) {
        if (event === "message") {
            this.messageHandlers.delete(handler);
            return this;
        }
        this.errorHandlers.delete(handler);
        return this;
    }
    /**
     * Base implementation used by subclasses that do not need async startup.
     */
    async start() {
        return undefined;
    }
    /**
     * Base implementation used by subclasses that do not need async teardown.
     */
    async stop() {
        // Stopping a listener should stop transport work, not unregister handlers.
    }
    /**
     * Emit a normalized message and route handler failures into `error`.
     */
    emitMessage(message) {
        for (const handler of this.messageHandlers) {
            try {
                const result = handler(message);
                if (isPromiseLike(result)) {
                    result.catch((error) => {
                        this.emitError(error);
                    });
                }
            }
            catch (error) {
                this.emitError(error);
            }
        }
    }
    /**
     * Emit an asynchronous error to registered observers.
     */
    emitError(error) {
        for (const handler of this.errorHandlers) {
            try {
                const result = handler(error);
                if (isPromiseLike(result)) {
                    result.catch(() => {
                        // Error handlers are terminal observers; do not recurse.
                    });
                }
            }
            catch {
                // Error handlers are terminal observers; do not recurse.
            }
        }
    }
}
/**
 * Detect whether a handler returned a promise-like object.
 */
function isPromiseLike(value) {
    return (!!value &&
        typeof value === "object" &&
        "then" in value &&
        typeof value.then === "function");
}
