/**
 * Track recently observed ids with a fixed upper bound so long-running
 * listeners do not retain every id forever.
 */
export declare class RecentIdTracker {
    private readonly maxSize;
    private readonly ids;
    private readonly order;
    constructor(maxSize?: number);
    /**
     * Record an id if it has not been seen yet.
     *
     * Returns `true` when the id is newly observed and `false` when it has
     * already been tracked.
     */
    remember(id: string): boolean;
}
