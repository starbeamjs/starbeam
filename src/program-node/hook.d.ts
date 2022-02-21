import { HookBlueprint } from "../hooks/simple.js";
import type { ReactiveMetadata } from "../core/metadata.js";
import type { Hook } from "../root/api/public.js";
import type { AnyKey } from "../strippable/wrapper.js";
import type { Root } from "../universe.js";
import { AbstractProgramNode, RenderedProgramNode } from "./interfaces/program-node.js";
import type { Reactive } from "../fundamental/types.js";
declare const UNINITIALIZED: unique symbol;
/**
 * This value is a sink for hooks. Importantly, if you finalize this value, its
 * source will also be finalized.
 */
export declare class HookValue<T = unknown> {
    #private;
    static create<T>(): HookValue<T>;
    /** @internal */
    static update<T>(slot: HookValue<T>, value: T): void;
    constructor(value: T | typeof UNINITIALIZED);
    get current(): T;
}
export declare type HookContainer = Record<AnyKey, HookValue>;
export declare class HookCursor {
    static create(): HookCursor;
}
export declare class HookProgramNode<T> extends AbstractProgramNode<HookCursor, HookValue> {
    #private;
    static create<T>(universe: Root, hook: HookBlueprint<T>): HookProgramNode<T>;
    private constructor();
    get metadata(): ReactiveMetadata;
    render(): RenderedProgramNode<HookValue<T>>;
}
export declare class RenderedHook<T> extends RenderedProgramNode<HookValue> {
    #private;
    static create<T>(universe: Root, hook: Reactive<Hook<T>>): RenderedHook<T>;
    private constructor();
    get metadata(): ReactiveMetadata;
    initialize(_inside: object): void;
    poll(inside: HookValue): void;
}
export {};
//# sourceMappingURL=hook.d.ts.map