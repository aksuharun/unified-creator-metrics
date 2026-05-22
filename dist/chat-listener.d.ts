import type { ChatErrorHandler, ChatEventHandler, ChatListener, ChatMessage } from "./types.js";
/**
 * Small internal event emitter for provider chat listeners.
 *
 * Provider implementations own transport state while this base class owns
 * handler registration and safe callback dispatch.
 */
export declare class ChatListenerEmitter<TMessage extends ChatMessage, TStartResult = void> implements ChatListener<TMessage, TStartResult> {
    private readonly messageHandlers;
    private readonly errorHandlers;
    /**
     * Register a message or error handler on the listener instance.
     */
    on(event: "message", handler: ChatEventHandler<TMessage>): this;
    on(event: "error", handler: ChatErrorHandler): this;
    /**
     * Remove a previously registered message or error handler.
     */
    off(event: "message", handler: ChatEventHandler<TMessage>): this;
    off(event: "error", handler: ChatErrorHandler): this;
    /**
     * Base implementation used by subclasses that do not need async startup.
     */
    start(): Promise<TStartResult>;
    /**
     * Base implementation used by subclasses that do not need async teardown.
     */
    stop(): Promise<void>;
    /**
     * Emit a normalized message and route handler failures into `error`.
     */
    protected emitMessage(message: TMessage): void;
    /**
     * Emit an asynchronous error to registered observers.
     */
    protected emitError(error: unknown): void;
}
