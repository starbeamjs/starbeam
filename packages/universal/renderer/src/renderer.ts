import type { Reactive } from "@starbeam/interfaces";
import type { Resource } from "@starbeam/resource";

import type { IntoResourceBlueprint } from "./resource.js";

/**
 * `SetupBlueprint` describes the parameter that you can pass to
 * {@linkcode setup}. It is a function that takes a {@linkcode Lifecycle}
 * and returns a value.
 *
 * In the simplest case, you can simply call setup with a function with no
 * parameters. The function will run during the setup phase, and return a stable
 * result for the lifetime of the component.
 *
 * You can also make use of the {@linkcode Lifecycle} to use resources, get
 * services or register code to run during the _idle_ or _layout_ phase.
 */
export type SetupBlueprint<T> = (lifecycle: Lifecycle) => T;

/**
 * `ReactiveBlueprint` is a function that takes a {@linkcode Lifecycle} and
 * returns an optionally reactive value. You can pass it to
 * {@linkcode useReactive} or {@linkcode setupReactive}. These functions will
 * instantiate the blueprint during the setup phase and return a stable reactive
 * value.
 *
 * If you pass a `ReactiveBlueprint` to {@linkcode useReactive}, you must also pass
 * dependencies to {@linkcode useReactive}. If the dependencies change, the
 * blueprint will re-evaluate, returning a new value.
 */
export type ReactiveBlueprint<T> = (lifecycle: Lifecycle) => T | Reactive<T>;

/**
 * `UseReactive` describes the parameter that you can pass to {@linkcode setupReactive}
 * or {@linkcode useReactive}.
 */
export type UseReactive<T> = ReactiveBlueprint<T> | Reactive<T>;

export interface Lifecycle {
  readonly use: <T>(blueprint: IntoResourceBlueprint<T>) => Resource<T>;
  readonly service: <T>(blueprint: IntoResourceBlueprint<T>) => Resource<T>;
  readonly on: {
    readonly idle: (handler: Handler) => void;
    readonly layout: (handler: Handler) => void;
  };
}

export type Handler = () => void;
