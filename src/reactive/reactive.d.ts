import { type IntoReactive } from "./base.js";
export declare const Reactive: {
    from<T>(reactive: IntoReactive<T>): Reactive<T>;
    is<T_1>(reactive: unknown): reactive is Reactive<T_1>;
};
import type * as types from "../fundamental/types.js";
export declare type Reactive<T = unknown> = types.Reactive<T>;
