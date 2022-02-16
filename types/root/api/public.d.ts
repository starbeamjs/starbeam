import { HookBlueprint, type HookConstructor, type ResourceHookConstructor } from "../../hooks/simple.js";
import type { Reactive } from "../../reactive/core.js";
import { ReactiveMemo } from "../../reactive/functions/memo.js";
export declare function hook<C extends ResourceHookConstructor<unknown>>(callback: C, description: string): C extends HookConstructor<infer T> ? HookBlueprint<T> : never;
export declare function hook<C extends () => Reactive<unknown>>(callback: C, description: string): C extends () => Reactive<infer T> ? HookBlueprint<T> : never;
export declare function Memo<T>(callback: () => T, description?: string): ReactiveMemo<T>;
export declare const lifetime: {
    on: {
        readonly destroy: (object: object, finalizer: import("../lifetime/lifetime.js").IntoFinalizer) => void;
    };
    link: (parent: object, child: object) => void;
    finalize: (object: object) => void;
    debug(...roots: object[]): readonly import("../lifetime/debug.js").DebugObjectLifetime[];
};
