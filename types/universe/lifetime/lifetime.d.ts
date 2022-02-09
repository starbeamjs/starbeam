import type { Universe } from "../universe.js";
import { DebugObjectLifetime, DebugFinalizer } from "./debug.js";
export interface UniverseLifetime {
    link(parent: object, child: object): void;
    readonly debug: readonly DebugObjectLifetime[];
}
export declare class Lifetime implements UniverseLifetime {
    #private;
    static scoped(): Lifetime;
    static finalize(lifetime: Lifetime, universe: Universe, object: object): void;
    private constructor();
    /**
     * This API largely exists to aid debugging. Nothing bad will happen if you
     * don't root anything, but it will be impossible to enumerate the
     * application's resources.
     */
    readonly root: (object: object) => void;
    /**
     * Roots are automatically unrooted when they are destroyed, which is the main
     * way that rooted objects should be unrooted. If you want to unroot an object
     * sooner (for example, to reduce noise in a debugging session), you can use
     * this API directly to "forget" a root that hasn't yet been finalized.
     */
    readonly unroot: (object: object) => void;
    readonly register: (object: object, finalizer: Finalizer) => void;
    readonly link: (parent: object, child: object) => void;
    get debug(): readonly DebugObjectLifetime[];
}
export declare class ObjectLifetime {
    #private;
    static of(object: object): ObjectLifetime;
    private constructor();
    get isEmpty(): boolean;
    add(finalizer: Finalizer): void;
    link(child: ObjectLifetime): void;
    finalize(): void;
    debug(): DebugObjectLifetime;
}
export declare class Finalizer {
    #private;
    static create<T>(callback: (token: T) => void, description: string, token: T): Finalizer;
    static create(callback: () => void, description: string): Finalizer;
    static from(finalizer: IntoFinalizer): Finalizer;
    static finalize(finalizer: Finalizer): void;
    private constructor();
    debug(): DebugFinalizer;
}
export declare type OnDestroy = [
    callback: (parameter: unknown) => void,
    token: unknown
];
export declare type IntoFinalizer = Finalizer | (() => void) | OnDestroy;
