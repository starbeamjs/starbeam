import { AbstractReactive, Reactive } from "../reactive/core.js";
import type { ReactiveMetadata } from "../reactive/metadata.js";
import type { IntoFinalizer } from "../universe.js";
import type { Universe } from "../universe/universe.js";
import type { Hook } from "./hook.js";
export declare type HookConstructor<T> = (hook: SimpleHook<T>) => Reactive<T>;
/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export declare class HookBlueprint<T> {
    readonly universe: Universe;
    readonly construct: HookConstructor<T>;
    readonly description: string;
    static create<T>(universe: Universe, construct: HookConstructor<T>, description: string): HookBlueprint<T>;
    private constructor();
}
export declare class SimpleHook<T> extends AbstractReactive<T> implements Hook<T> {
    #private;
    static construct<T>(blueprint: HookBlueprint<T>): Reactive<Hook<T>>;
    constructor(universe: Universe, reactive: Reactive<T> | null, description: string);
    get metadata(): ReactiveMetadata;
    get description(): string;
    onDestroy(finalizer: IntoFinalizer): void;
    use<T>(blueprint: HookBlueprint<T>): Reactive<T>;
    get current(): T;
    poll(): void;
}
