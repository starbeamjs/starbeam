import type { Description } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import type { FormulaFn, ReadValue } from "@starbeam/reactive";

import { ResourceBlueprintImpl, type UseOptions } from "./resource.js";
import type { ResourceConstructor } from "./types.js";

export type UseFnOptions<M> = UseOptions<
  M,
  {
    readonly description?: Description | undefined;
    readonly lifetime: object;
  }
>;

/**
 * The `use` function instantiates resources (it's like `new`, but for
 * resources). It takes a resource blueprint or resource constructor and returns
 * a resource instance.
 *
 * When it receives a resource constructor, it behaves as if the `use` function
 * was called with a blueprint created from the constructor.
 */
export function use<T, M>(
  blueprint: IntoResourceBlueprint<T, M>,
  options: UseFnOptions<M>
): Resource<T> {
  return ResourceBlueprintImpl.evaluate(blueprint, options, options.lifetime);
}

declare const ResourceBrand: unique symbol;
export type Resource<T = unknown> = FormulaFn<ReadValue<T>> & {
  [ResourceBrand]: true;
};
export const Resource = ResourceBlueprintImpl.create;

export { isResource } from "./resource.js";

export type ResourceBlueprint<T = unknown, M = unknown> =
  | ResourceBlueprintImpl<T, M>
  | ResourceBlueprintImpl<Reactive<T>, void>;

export type IntoResourceBlueprint<T, M> =
  | ResourceBlueprint<T, M>
  | ResourceConstructor<T, void>;

export function IntoResourceBlueprint<T, M>(
  value: IntoResourceBlueprint<T, M>
): ResourceBlueprint<T, M> {
  if (isResourceBlueprint(value)) {
    return value;
  } else {
    return Resource(value);
  }
}

export function isResourceBlueprint(
  value: unknown
): value is ResourceBlueprint<unknown> {
  return value instanceof ResourceBlueprintImpl;
}