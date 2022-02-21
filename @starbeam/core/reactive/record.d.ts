import type { ExtendsReactive } from "./base.js";
import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
export declare type InnerDict = {
    readonly [P in PropertyKey]: ExtendsReactive<unknown>;
};
/**
 * `ReactiveRecord` wraps a JavaScript object whose values are other Reactive`
 * values. The keys of a `ReactiveRecord` are fixed at construction time, and
 * the `Reactive` values may not be changed at runtime.
 *
 * If you want to update the values of a `ReactiveRecord`, the reactive value
 * must be a `Cell`, and you must update the `Cell` directly.
 */
export declare class ReactiveRecord<D extends InnerDict> extends HasMetadata {
    #private;
    static is(value: unknown): value is AnyReactiveRecord;
    constructor(dict: D);
    get metadata(): ReactiveMetadata;
    get<K extends keyof D>(key: K): D[K];
}
export declare type AnyReactiveRecord = ReactiveRecord<InnerDict>;
//# sourceMappingURL=record.d.ts.map