import type { Reactive } from "../fundamental/types.js";
export declare type PollResult<T> = {
    status: "initial";
    value: T;
} | {
    status: "unchanged";
    value: T;
} | {
    status: "changed";
    value: T;
};
export interface ExternalSubscription<T = unknown> {
    poll: () => PollResult<T>;
    unsubscribe: () => void;
}
/**
 * This API allows external consumers of Starbeam Reactive values to subscribe
 * (and unsubscribe) to a signal that a change in the underlying value is ready.
 *
 * It does *not* recompute the value, which has several benefits:
 *
 * - If a change was ready multiple times before a consumer had a chance to ask
 *   for the value of a reactive computation, the computation will only occur
 *   once.
 * - If a change was ready, but its consumer never needs the value, the reactive
 *   computation will never occur.
 *
 * The change readiness notification occurs synchronously and is not batched. It
 * is not intended to trigger synchronous re-renders, but rather to inform the
 * consumer that a scheduled revalidation is needed.
 *
 * The `subscribe` function returns an `ExternalSubscription`, which provides:
 *
 * - a `poll()` method that the consumer can call once it receives the change
 *   readiness notification. The `poll()` method returns a status (`initial` or
 *   `changed` or `unchanged`) as well as the current value.
 * - an `unsubscribe()` method that the consumer should call when it is no
 *   longer interested in receiving notifications. Once this method is called,
 *   no further notifications will occur.
 */
export declare function subscribe<T>(reactive: Reactive<T>, ready: () => void, description?: string): ExternalSubscription<T>;
//# sourceMappingURL=sync.d.ts.map