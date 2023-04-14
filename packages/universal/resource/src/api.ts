import type { Description } from "@starbeam/interfaces";
import type { FormulaFn } from "@starbeam/reactive";

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

export declare const ResourceBrand: unique symbol;
export type Resource<T = unknown> = FormulaFn<T> & {
  [ResourceBrand]: true;
};
export const Resource = ResourceBlueprintImpl.create;

export { isResource } from "./resource.js";

export type ResourceBlueprint<T = unknown, M = unknown> = ResourceBlueprintImpl<
  T,
  M
>;

export type IntoResourceBlueprint<T, M = void> =
  | ResourceBlueprint<T, M>
  | ResourceConstructor<T, void>;

export function IntoResourceBlueprint<T, M>(
  value: IntoResourceBlueprint<T, M>
): ResourceBlueprint<T, M> {
  if (isResourceBlueprint(value)) {
    return value;
  } else {
    return Resource(value) as ResourceBlueprint<T, M>;
  }
}

export function isResourceBlueprint(
  value: unknown
): value is ResourceBlueprint<unknown, unknown> {
  return value instanceof ResourceBlueprintImpl;
}
