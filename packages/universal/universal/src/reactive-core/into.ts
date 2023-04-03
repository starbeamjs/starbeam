import type { Description } from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
import { intoReactive, isReactive } from "@starbeam/reactive";
import { Resource, type ResourceBlueprint } from "@starbeam/resource";

import type { ReactiveBlueprint } from "./reactive.js";
import { type Blueprint, Reactive, type ReactiveFactory } from "./reactive.js";

export type IntoResource<T> = ResourceBlueprint<T> | ReactiveBlueprint<T>;

export type IntoResourceType<I extends IntoResource<unknown>> =
  I extends ResourceBlueprint<infer T, infer D>
    ? ResourceBlueprint<T, D>
    : I extends ReactiveBlueprint<infer T> | ReactiveFactory<infer T>
    ? ReactiveBlueprint<T>
    : never;

export function IntoResource<I extends IntoResource<unknown>>(
  create: I,
  description: Description
): IntoResourceType<I> {
  return typeof create === "function"
    ? (Resource(create, description) as IntoResourceType<I>)
    : (create as unknown as IntoResourceType<I>);
}

export type Factory<T> = Blueprint<T> | ReactiveFactory<T>;


export const Factory = {
  create: createReactiveObject,
  initial,
  resource,
};

function initial<T>(create: IntoResource<T>): T | undefined {
  if (create instanceof ResourceBlueprint) {
    return ResourceBlueprint.initial(create);
  } else {
    return undefined;
  }
}

function resource<T>(
  create: IntoResource<T>,
  owner: object,
  description?: Description | string
): Reactive<T> {
  const desc = Desc("resource", description);
  return intoReactive(IntoResource(create, desc).create(owner)) as Reactive<T>;
}

export type IntoReactiveObject<T> = ReactiveBlueprint<T> | ReactiveFactory<T>;

function createReactiveObject<U, R extends Reactive<unknown>>(
  create: IntoReactiveObject<U> | R
): U | R;
function createReactiveObject<T>(create: IntoReactiveObject<T>): T;
function createReactiveObject<T extends Reactive<unknown>>(create: T): T;
function createReactiveObject(
  create: IntoReactiveObject<unknown> | Reactive<unknown>
): unknown {
  if (isReactive(create)) {
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
