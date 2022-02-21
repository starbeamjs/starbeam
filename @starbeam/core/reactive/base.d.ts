import { HasMetadata } from "../core/metadata.js";
import type { UNINITIALIZED } from "../fundamental/constants.js";
import type { Cell, Reactive as ReactiveType } from "../fundamental/types.js";
export interface InspectReactive {
    name: string;
    description: string;
}
export declare abstract class ExtendsReactive<T> extends HasMetadata implements ReactiveType<T> {
    #private;
    constructor(inspect: InspectReactive);
    abstract get current(): T;
    abstract get description(): string;
    abstract get cells(): UNINITIALIZED | readonly Cell[];
    toString(): string;
}
export declare type ReactiveValue<R extends ReactiveType<unknown>> = R extends ReactiveType<infer Value> ? Value : never;
export declare type IntoReactive<T> = ReactiveType<T> | T;
export declare type StaticReactive<T> = ReactiveType<T> & {
    metadata: {
        isStatic: true;
    };
};
export declare type DynamicReactive<T> = ReactiveType<T> & {
    metadata: {
        isStatic: false;
    };
};
export declare type AnyReactive = ReactiveType<unknown>;
//# sourceMappingURL=base.d.ts.map