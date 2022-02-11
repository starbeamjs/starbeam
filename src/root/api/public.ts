import { HookBlueprint, HookConstructor } from "../../hooks/simple.js";
import { Cell } from "../../reactive/cell.js";
import { Memo } from "../../reactive/functions/memo.js";
import { Abstraction } from "../../strippable/abstraction.js";
import type { FIXME } from "../../utils.js";
import { LIFETIME } from "../lifetime/lifetime.js";

export function hook<C extends HookConstructor<unknown>>(
  callback: C,
  description: string
): C extends HookConstructor<infer T> ? HookBlueprint<T> : never {
  return HookBlueprint.create(
    callback,
    description
  ) as FIXME<"Decide if we want a narrower type">;
}

export function cell<T>(value: T, description = "anonymous"): Cell<T> {
  return Cell.create(value, description);
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
export function memo<T>(
  callback: () => T,
  description = `memo ${Abstraction.callerFrame().trimStart()}`
): Memo<T> {
  return Memo.create(callback, description);
}

export const lifetime = {
  on: LIFETIME.on,

  link: LIFETIME.link,
  finalize: LIFETIME.finalize,

  debug(...roots: object[]) {
    return LIFETIME.debug(...roots);
  },
};
