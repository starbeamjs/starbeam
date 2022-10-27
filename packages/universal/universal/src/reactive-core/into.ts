import type { ReactiveBlueprint } from "./reactive.js";
import { type Blueprint, type ReactiveFactory, Reactive } from "./reactive.js";
import { type ResourceFactory, Resource } from "./resource/resource.js";

export type IntoResource<T> = Blueprint<T> | ResourceFactory<T>;

export function IntoResource<T>(create: IntoResource<T>): Blueprint<T> {
  return typeof create === "function" ? Resource(create) : create;
}

export type Factory<T> = Blueprint<T> | ReactiveFactory<T>;

export const Factory = {
  create: createReactiveObject,

  resource: <T>(create: IntoResource<T>, owner: object): Reactive<T> =>
    Reactive.from(IntoResource(create).create(owner)),
};

export type IntoReactiveObject<T> = ReactiveBlueprint<T> | ReactiveFactory<T>;

function createReactiveObject<U, R extends Reactive<unknown>>(
  create: IntoReactiveObject<U> | R
): U | R;
function createReactiveObject<T>(create: IntoReactiveObject<T>): T;
function createReactiveObject<T extends Reactive<unknown>>(create: T): T;
function createReactiveObject(
  create: IntoReactiveObject<unknown> | Reactive<unknown>
): unknown {
  if (Reactive.is(create)) {
    return create;
  } else {
    return IntoReactiveObject(create).create();
  }
}

function IntoReactiveObject<T>(
  create: ReactiveBlueprint<T> | ReactiveFactory<T>
): ReactiveBlueprint<T> {
  return typeof create === "function" ? Reactive(create) : create;
}
