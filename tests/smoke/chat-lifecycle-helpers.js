import { clearTimeout, setTimeout } from "node:timers"
import { setTimeout as sleep } from "node:timers/promises"
import { getSmokeMessage, optionalEnv } from "./helpers.js"

const DEFAULT_CHAT_READ_TIMEOUT_MS = 45000
const DEFAULT_DELETE_DELAY_MS = 5000
const DEFAULT_MAX_CHAT_MESSAGE_LENGTH = 200

export { sleep }

export function getChatReadTimeoutMs() {
    return getPositiveIntegerEnv(
        "CHAT_SMOKE_TIMEOUT_MS",
        DEFAULT_CHAT_READ_TIMEOUT_MS,
    )
}

export function getDeleteDelayMs() {
    return getNonNegativeIntegerEnv(
        "CHAT_DELETE_DELAY_MS",
        DEFAULT_DELETE_DELAY_MS,
    )
}

export function createUniqueSmokeMessage(
    envName,
    maxLength = DEFAULT_MAX_CHAT_MESSAGE_LENGTH,
) {
    const suffix = ` [smoke:${Date.now()}]`
    const base = getSmokeMessage(envName)
    const maxBaseLength = Math.max(0, maxLength - suffix.length)

    return `${base.slice(0, maxBaseLength)}${suffix}`
}

export function createMessageWaiter(listener, predicate, timeoutMs) {
    let settled = false
    let timeout
    let cleanup = () => {}

    const promise = new Promise((resolve, reject) => {
        function settle(callback, value) {
            if (settled) {
                return
            }

            settled = true
            cleanup()
            callback(value)
        }

        function onMessage(message) {
            if (predicate(message)) {
                settle(resolve, message)
            }
        }

        function onError(error) {
            settle(reject, error)
        }

        cleanup = () => {
            clearTimeout(timeout)
            listener.off("message", onMessage)
            listener.off("error", onError)
        }

        timeout = setTimeout(() => {
            settle(
                reject,
                new Error(
                    `Timed out after ${timeoutMs}ms waiting to read the sent chat message.`,
                ),
            )
        }, timeoutMs)

        listener.on("message", onMessage)
        listener.on("error", onError)
    })

    return {
        promise,
        cancel() {
            if (!settled) {
                settled = true
                cleanup()
            }
        },
    }
}

function getPositiveIntegerEnv(name, fallback) {
    const value = Number(optionalEnv(name, String(fallback)))

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer.`)
    }

    return value
}

function getNonNegativeIntegerEnv(name, fallback) {
    const value = Number(optionalEnv(name, String(fallback)))

    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${name} must be a non-negative integer.`)
    }

    return value
}
