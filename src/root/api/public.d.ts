import type { Reactive } from "../../fundamental/types.js";
import { HookBlueprint, type HookConstructor, type ResourceHookConstructor } from "../../hooks/simple.js";
export declare type Hook<T = unknown> = Reactive<T>;
export declare function Hook<C extends ResourceHookConstructor<unknown>>(callback: C, description: string): C extends HookConstructor<infer T> ? HookBlueprint<T> : never;
export declare function Hook<C extends () => Reactive<unknown>>(callback: C, description: string): C extends () => Reactive<infer T> ? HookBlueprint<T> : never;
export declare function Memo<T>(callback: () => T, description?: string): Reactive<T>;
export declare const lifetime: {
    on: {
        readonly finalize: (object: object, finalizer: import("../../core/lifetime/lifetime.js").IntoFinalizer) => void;
    };
    link: (parent: object, child: object) => void;
    finalize: (object: object) => void;
    debug(...roots: object[]): readonly import("../../core/lifetime/debug.js").DebugObjectLifetime[];
};
//# sourceMappingURL=public.d.ts.map