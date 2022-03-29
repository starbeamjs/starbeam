import { LIFETIME } from "@starbeam/lifetime";
import { TIMELINE } from "@starbeam/timeline";

// export type Hook<T = unknown> = Reactive<T>;

// export function Hook<C extends ResourceHookConstructor<unknown>>(
//   callback: C,
//   description: string
// ): C extends HookConstructor<infer T> ? HookBlueprint<T> : never;
// export function Hook<T, C extends ResourceHookConstructor<T>>(
//   callback: C,
//   description: string
// ): HookBlueprint<T>;
// export function Hook<C extends () => Reactive<unknown>>(
//   callback: C,
//   description: string
// ): C extends () => Reactive<infer T> ? HookBlueprint<T> : never;
// export function Hook<C extends ResourceHookConstructor<unknown>>(
//   callback: C,
//   description: string
// ): C extends ResourceHookConstructor<infer T> ? HookBlueprint<T> : never {
//   return HookBlueprint.create(
//     callback,
//     description
//   ) as FIXME<"Decide if we want a narrower type">;
// }

export const lifetime = {
  on: LIFETIME.on,

  link: LIFETIME.link,
  finalize: LIFETIME.finalize,

  debug(...roots: object[]) {
    return LIFETIME.debug(...roots);
  },
} as const;

export const timeline = {
  on: TIMELINE.on,
} as const;
