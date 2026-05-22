/**
 * Track recently observed ids with a fixed upper bound so long-running
 * listeners do not retain every id forever.
 */
export class RecentIdTracker {
    maxSize;
    ids = new Set();
    order = [];
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        if (!Number.isInteger(maxSize) || maxSize <= 0) {
            throw new TypeError("maxSize must be a positive integer.");
        }
    }
    /**
     * Record an id if it has not been seen yet.
     *
     * Returns `true` when the id is newly observed and `false` when it has
     * already been tracked.
     */
    remember(id) {
        if (this.ids.has(id)) {
            return false;
        }
        this.ids.add(id);
        this.order.push(id);
        if (this.order.length > this.maxSize) {
            const oldestId = this.order.shift();
            if (oldestId !== undefined) {
                this.ids.delete(oldestId);
            }
        }
        return true;
    }
}
