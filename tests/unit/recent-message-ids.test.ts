import { describe, expect, it } from "vitest"
import { RecentIdTracker } from "../../src/recent-message-ids.js"

describe("RecentIdTracker", () => {
    it("returns false when the same id is seen twice", () => {
        const tracker = new RecentIdTracker(2)

        expect(tracker.remember("message-1")).toBe(true)
        expect(tracker.remember("message-1")).toBe(false)
    })

    it("evicts the oldest id when the tracker reaches its limit", () => {
        const tracker = new RecentIdTracker(2)

        expect(tracker.remember("message-1")).toBe(true)
        expect(tracker.remember("message-2")).toBe(true)
        expect(tracker.remember("message-3")).toBe(true)
        expect(tracker.remember("message-1")).toBe(true)
        expect(tracker.remember("message-3")).toBe(false)
    })
})
