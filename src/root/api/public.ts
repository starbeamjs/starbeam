import { LIFETIME } from "../../core/lifetime/lifetime.js";
import type { Reactive } from "../../fundamental/types.js";
import {
  HookBlueprint,
  type HookConstructor,
  type ResourceHookConstructor,
} from "../../hooks/simple.js";
import { ReactiveMemo } from "../../reactive/memo.js";
import { Abstraction } from "../../strippable/abstraction.js";
import type { FIXME } from "../../utils.js";

export type Hook<T = unknown> = Reactive<T>;

export function Hook<C extends ResourceHookConstructor<unknown>>(
  callback: C,
  description: string
): C extends HookConstructor<infer T> ? HookBlueprint<T> : never;
export function Hook<C extends () => Reactive<unknown>>(
  callback: C,
  description: string
): C extends () => Reactive<infer T> ? HookBlueprint<T> : never;
export function Hook<C extends ResourceHookConstructor<unknown>>(
  callback: C,
  description: string
): C extends ResourceHookConstructor<infer T> ? HookBlueprint<T> : never {
  return HookBlueprint.create(
    callback,
    description
  ) as FIXME<"Decide if we want a narrower type">;
}

// function match<C extends AnyReactiveChoice>(
//   reactive: Reactive<C>,
//   matcher: C extends infer ActualC
//     ? ActualC extends AnyReactiveChoice
//       ? Matcher<ActualC>
//       : never
//     : never,
//   description = `match ${reactive.description}`
// ): ReactiveMatch<C, typeof matcher> {
//   return ReactiveMatch.match(reactive, matcher, description);
// }

/*
 * Create a memoized value that re-executes whenever any cells used in its
 * computation invalidate.
 */
export function Memo<T>(
  callback: () => T,
  description = `memo ${Abstraction.callerFrame()}`
): Reactive<T> {
  return ReactiveMemo.create(callback, description);
}

export const lifetime = {
  on: LIFETIME.on,

  link: LIFETIME.link,
  finalize: LIFETIME.finalize,

  debug(...roots: object[]) {
    return LIFETIME.debug(...roots);
  },
};
