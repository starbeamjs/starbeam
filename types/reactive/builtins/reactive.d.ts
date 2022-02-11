import type { Reactive } from "../core.js";
import type { ObjectType } from "./type-magic.js";
export declare function reactive<M extends Map<unknown, unknown>>(map: M): M;
export declare function reactive<T>(array: readonly T[]): `it doesn't make sense to turn a readonly array into a reactive array`;
export declare function reactive<T>(array: T[]): T[];
export declare function reactive<O extends ObjectType>(object: O): O;
export declare function reactive<T>(callback: () => T, description?: string): Reactive<T>;
