import { HasMetadata } from "../core/metadata.js";
import type * as types from "../fundamental/types.js";
export declare abstract class ExtendsReactive<T> extends HasMetadata implements types.Reactive<T> {
    readonly id: number;
    abstract get current(): T;
    abstract get description(): string;
}
export declare type ReactiveValue<R extends types.Reactive<unknown>> = R extends types.Reactive<infer Value> ? Value : never;
export declare type IntoReactive<T> = types.Reactive<T> | T;
export declare type StaticReactive<T> = types.Reactive<T> & {
    metadata: {
        isStatic: true;
    };
};
export declare type DynamicReactive<T> = types.Reactive<T> & {
    metadata: {
        isStatic: false;
    };
};
export declare type AnyReactive = types.Reactive<unknown>;
