import { HookBlueprint, } from "../../hooks/simple.js";
import { ReactiveMemo } from "../../reactive/memo.js";
import { Abstraction } from "../../strippable/abstraction.js";
import { LIFETIME } from "../../core/lifetime/lifetime.js";
export function Hook(callback, description) {
    return HookBlueprint.create(callback, description);
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
export function Memo(callback, description = `memo ${Abstraction.callerFrame().trimStart()}`) {
    return ReactiveMemo.create(callback, description);
}
export const lifetime = {
    on: LIFETIME.on,
    link: LIFETIME.link,
    finalize: LIFETIME.finalize,
    debug(...roots) {
        return LIFETIME.debug(...roots);
    },
};
//# sourceMappingURL=public.js.map