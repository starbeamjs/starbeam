import { TIMELINE } from "../core/timeline/timeline.js";
import { UNINITIALIZED } from "../fundamental/constants.js";
import { Abstraction, lifetime } from "../index.js";
import { Cell, ReactiveCell } from "../reactive/cell.js";
import { assert } from "../strippable/core.js";
import { LOGGER } from "../strippable/trace.js";
function initialize(subscription) {
    lifetime.on.finalize(subscription, () => subscription.unsubscribe());
    return subscription;
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
export function subscribe(reactive, ready, description = `subscriber (to ${reactive.description}) <- ${Abstraction.callerFrame()}`) {
    if (reactive.isConstant()) {
        return initialize(ConstantSubscription.create(reactive.current));
    }
    else if (reactive instanceof ReactiveCell) {
        return initialize(CellSubscription.create(reactive, ready, description));
    }
    else {
        return initialize(ReactiveSubscription.create(reactive, ready, description));
    }
}
class ConstantSubscription {
    static create(value) {
        return new ConstantSubscription(value);
    }
    #value;
    constructor(value) {
        this.#value = value;
    }
    poll = () => ({ status: "unchanged", value: this.#value });
    unsubscribe = () => {
        /* noop */
    };
}
/**
 * This is a special-case of subscription to a single cell that doesn't require
 * much bookkeeping.
 */
class CellSubscription {
    unsubscribe;
    static create(cell, ready, description) {
        let teardown = TIMELINE.on.update(cell, ready);
        return new CellSubscription(cell, UNINITIALIZED, teardown, description);
    }
    #last;
    #reactive;
    #description;
    constructor(reactive, last, unsubscribe, description) {
        this.unsubscribe = unsubscribe;
        this.#reactive = reactive;
        this.#last = last;
        this.#description = description;
    }
    poll = () => {
        let value = this.#reactive.current;
        if (this.#last === UNINITIALIZED) {
            this.#last = value;
            return { status: "initial", value };
        }
        else if (this.#last === value) {
            return { status: "unchanged", value };
        }
        else {
            return { status: "changed", value };
        }
    };
}
class ReactiveSubscription {
    static create(reactive, ready, description) {
        let cells = new Map();
        if (reactive.cells !== UNINITIALIZED) {
            for (let cell of reactive.cells) {
                cells.set(cell, TIMELINE.on.update(cell, ready));
            }
        }
        return new ReactiveSubscription(UNINITIALIZED, reactive, cells, ready, description);
    }
    #last;
    #reactive;
    #cells;
    #notify;
    #description;
    constructor(last, reactive, cells, notify, description) {
        this.#last = last;
        this.#reactive = reactive;
        this.#cells = cells;
        this.#notify = notify;
        this.#description = description;
    }
    poll = () => {
        let newValue = this.#reactive.current;
        let newCells = this.#reactive.cells;
        assert(newCells !== UNINITIALIZED, `A reactive's cells should not be uninitialized once its value was consumed`);
        this.#sync(new Set(newCells));
        if (this.#last === newValue) {
            return { status: "unchanged", value: newValue };
        }
        else {
            this.#last = newValue;
            return { status: "changed", value: newValue };
        }
    };
    unsubscribe = () => {
        for (let teardown of this.#cells.values()) {
            teardown();
        }
    };
    #sync(newCells) {
        for (let [cell, teardown] of this.#cells) {
            if (!newCells.has(cell)) {
                LOGGER.trace.log(`tearing down (${this.#description}) cell`, cell, this.#notify);
                teardown();
                this.#cells.delete(cell);
            }
        }
        for (let cell of newCells) {
            if (!this.#cells.has(cell)) {
                LOGGER.trace.log(`setting up (${this.#description}) cell`, cell, this.#notify);
                let teardown = TIMELINE.on.update(cell, this.#notify);
                this.#cells.set(cell, teardown);
            }
        }
    }
}
//# sourceMappingURL=sync.js.map