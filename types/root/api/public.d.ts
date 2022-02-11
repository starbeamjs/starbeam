import { HookBlueprint, HookConstructor } from "../../hooks/simple.js";
import { Cell } from "../../reactive/cell.js";
import { Memo } from "../../reactive/functions/memo.js";
export declare function hook<C extends HookConstructor<unknown>>(callback: C, description: string): C extends HookConstructor<infer T> ? HookBlueprint<T> : never;
export declare function cell<T>(value: T, description?: string): Cell<T>;
export declare function memo<T>(callback: () => T, description?: string): Memo<T>;
export declare const lifetime: {
    on: {
        readonly destroy: (object: object, finalizer: import("../lifetime/lifetime.js").IntoFinalizer) => void;
    };
    link: (parent: object, child: object) => void;
    finalize: (object: object) => void;
    debug(...roots: object[]): readonly import("../lifetime/debug.js").DebugObjectLifetime[];
};
