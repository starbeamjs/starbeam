/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ReactiveCell,
  Cell,
  enumerate,
  HookBlueprint,
  InferReturn,
  IntoReactive,
  Reactive,
} from "starbeam";
import { use } from "./hooks.js";

export type StarbeamHook<
  Args extends readonly any[] = readonly any[],
  Ret extends HookBlueprint<any> = HookBlueprint<any>
> = (...args: Args) => Ret;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type HookArgs<Args extends readonly any[]> = {
  [P in keyof Args]: Args[P] extends Reactive<infer T>
    ? IntoReactive<T>
    : Args[P];
};

type IdiomaticHookArgs<Args extends readonly any[]> = {
  [P in keyof Args]: Args[P] extends Reactive<infer T> ? T : Args[P];
};

type HookReturn<Ret extends HookBlueprint<any>> = Ret extends HookBlueprint<
  infer T
>
  ? T extends undefined
    ? void
    : T
  : never;

export function hookify<
  Args extends readonly any[],
  Ret extends HookBlueprint<any>
>(
  hook: StarbeamHook<Args, Ret>,
  description = hook.name || `(anonymous hook)`
): (...args: IdiomaticHookArgs<Args>) => HookReturn<Ret> {
  let stableArgs: readonly ReactiveCell<unknown>[];

  return ((...args: IdiomaticHookArgs<readonly unknown[]>): HookReturn<Ret> => {
    if (stableArgs === undefined) {
      stableArgs = args.map(
        (arg: unknown, i: number): ReactiveCell<unknown> =>
          Cell(arg, `${description} (param ${i + 1})`)
      );
    }

    for (let [i, arg] of enumerate(args)) {
      if (Reactive.is(arg)) {
        continue;
      }

      stableArgs[i].update(arg as unknown);
    }

    return use(hook(...(stableArgs as Args)));
  }) as InferReturn;
}
