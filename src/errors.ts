export type PlatformApiErrorOptions = {
    platform: string
    status?: number
    cause?: unknown
}

export type PlatformValidationErrorOptions = {
    platform?: string
}

/**
 * Error thrown when a provider request fails or returns an invalid response.
 */
export class PlatformApiError extends Error {
    readonly platform: string
    readonly status?: number

    constructor(message: string, options: PlatformApiErrorOptions) {
        super(message, { cause: options.cause })
        this.name = "PlatformApiError"
        this.platform = options.platform
        this.status = options.status
    }
}

/**
 * Error thrown when the caller passes unsupported or incomplete input.
 */
export class PlatformValidationError extends Error {
    readonly platform?: string

    constructor(message: string, options: PlatformValidationErrorOptions = {}) {
        super(message)
        this.name = "PlatformValidationError"
        this.platform = options.platform
    }
}
