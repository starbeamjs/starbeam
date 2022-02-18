import { DebugObjectLifetime, DebugFinalizer } from "./debug.js";
export declare class Lifetime {
    #private;
    static scoped(): Lifetime;
    private constructor();
    readonly on: {
        readonly finalize: (object: object, finalizer: IntoFinalizer) => void;
    };
    readonly finalize: (object: object) => void;
    readonly link: (parent: object, child: object) => void;
    debug(...roots: object[]): readonly DebugObjectLifetime[];
}
export declare const LIFETIME: Lifetime;
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
