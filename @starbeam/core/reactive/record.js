import { isObject } from "../utils.js";
import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
/**
 * `ReactiveRecord` wraps a JavaScript object whose values are other Reactive`
 * values. The keys of a `ReactiveRecord` are fixed at construction time, and
 * the `Reactive` values may not be changed at runtime.
 *
 * If you want to update the values of a `ReactiveRecord`, the reactive value
 * must be a `Cell`, and you must update the `Cell` directly.
 */
export class ReactiveRecord extends HasMetadata {
    static is(value) {
        return isObject(value) && value instanceof ReactiveRecord;
    }
    #dict;
    constructor(dict) {
        super();
        this.#dict = dict;
    }
    get metadata() {
        return ReactiveMetadata.all(...Object.values(this.#dict));
    }
    get(key) {
        return this.#dict[key];
    }
}
//# sourceMappingURL=record.js.map