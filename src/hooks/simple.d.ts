import { ExtendsReactive } from "../reactive/base.js";
import type { ReactiveMetadata } from "../core/metadata.js";
import { type IntoFinalizer } from "../core/lifetime/lifetime.js";
import type { Reactive } from "../fundamental/types.js";
export declare type ResourceHookConstructor<T> = (hook: SimpleHook<T>) => Reactive<T>;
export declare type DataHookConstructor<T> = () => Reactive<T>;
export declare type HookConstructor<T> = ResourceHookConstructor<T> | DataHookConstructor<T>;
/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export declare class HookBlueprint<T> {
    readonly construct: ResourceHookConstructor<T>;
    readonly description: string;
    static create<T>(construct: ResourceHookConstructor<T>, description: string): HookBlueprint<T>;
    private constructor();
    asData(): Reactive<T>;
}
export declare class SimpleHook<T> extends ExtendsReactive<T> {
    #private;
    static create<T>(reactive: Reactive<T> | null, description: string): SimpleHook<T>;
    static construct<T>(blueprint: HookBlueprint<T>): Reactive<Reactive<T>>;
    private constructor();
    get metadata(): ReactiveMetadata;
    get description(): string;
    onDestroy(finalizer: IntoFinalizer): void;
    use<T>(blueprint: HookBlueprint<T>): Reactive<T>;
    get current(): T;
    poll(): void;
}
