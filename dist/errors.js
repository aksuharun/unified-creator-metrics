/**
 * Error thrown when a provider request fails or returns an invalid response.
 */
export class PlatformApiError extends Error {
    platform;
    status;
    constructor(message, options) {
        super(message, { cause: options.cause });
        this.name = "PlatformApiError";
        this.platform = options.platform;
        this.status = options.status;
    }
}
/**
 * Error thrown when the caller passes unsupported or incomplete input.
 */
export class PlatformValidationError extends Error {
    platform;
    constructor(message, options = {}) {
        super(message);
        this.name = "PlatformValidationError";
        this.platform = options.platform;
    }
}
