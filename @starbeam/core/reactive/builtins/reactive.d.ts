import type { Reactive } from "../../fundamental/types.js";
import type { AnyRecord } from "../../strippable/wrapper.js";
import { Cell } from "../cell.js";
export declare type Builtin = Map<unknown, unknown> | Set<unknown> | WeakMap<object, unknown> | WeakSet<object>;
declare type Primitive = string | number | boolean | symbol | bigint | null | undefined;
export declare function builtin<K, V>(value: typeof Map): Map<K, V>;
export declare function builtin<V>(value: typeof Set): Set<V>;
export declare function builtin<K extends object, V>(value: typeof WeakMap): WeakMap<K, V>;
export declare function builtin<V extends object>(value: typeof WeakSet): WeakSet<V>;
export declare function builtin<M extends () => any>(callback: M): M extends () => infer T ? Reactive<T> : never;
export declare function builtin<T extends Primitive>(value: T): Cell<T>;
export declare function builtin<T extends Record<string, unknown>>(object: T): T;
export declare function builtin<T>(value: T[]): T[];
export declare function builtin<R extends AnyRecord>(value: R): R;
export {};
//# sourceMappingURL=reactive.d.ts.map