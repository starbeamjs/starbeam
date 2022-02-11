import { HasMetadata } from "./metadata.js";
export declare abstract class AbstractReactive<T> extends HasMetadata {
    static from<T>(reactive: IntoReactive<T>): AbstractReactive<T>;
    static is<T>(reactive: unknown | AbstractReactive<T>): reactive is AbstractReactive<T>;
    abstract get current(): T;
    abstract get description(): string;
}
export declare type Reactive<T = unknown> = AbstractReactive<T>;
export declare const Reactive: typeof AbstractReactive;
export declare type ReactiveValue<R extends AbstractReactive<unknown>> = R extends AbstractReactive<infer Value> ? Value : never;
export declare type IntoReactive<T> = AbstractReactive<T> | T;
export declare type StaticReactive<T> = AbstractReactive<T> & {
    metadata: {
        isStatic: true;
    };
};
export declare type DynamicReactive<T> = AbstractReactive<T> & {
    metadata: {
        isStatic: false;
    };
};
export declare type AnyReactive = AbstractReactive<unknown>;
