import type { Description } from "@starbeam/interfaces";
import type { FormulaFn } from "@starbeam/reactive";
import { isPresent, verified } from "@starbeam/verify";

import {
  isResource,
  ResourceBlueprintImpl,
  setupResource,
} from "./resource.js";
import type { ResourceConstructor } from "./types.js";

export interface UseFnOptions {
  readonly description?: Description | undefined;
  readonly lifetime: object;
}

/**
 * The `use` function instantiates resources (it's like `new`, but for
 * resources). It takes a resource blueprint or resource constructor and returns
 * a resource instance.
 *
 * When it receives a resource constructor, it behaves as if the `use` function
 * was called with a blueprint created from the constructor.
 */
export function use<T>(
  blueprint: IntoResourceBlueprint<T>,
  options: UseFnOptions
): Resource<T> {
  return ResourceBlueprintImpl.evaluate(blueprint, options, options.lifetime);
}

export function setup<T>(blueprint: Resource<T>): Resource<T>;
export function setup<T>(
  blueprint: IntoResourceBlueprint<T>,
  options: UseFnOptions
): Resource<T>;
export function setup<T>(
  blueprint: IntoResourceBlueprint<T> | Resource<T>,
  options?: UseFnOptions
): Resource<T> {
  const resource = isResource(blueprint)
    ? blueprint
    : ResourceBlueprintImpl.evaluate(
        blueprint,
        verified(options, isPresent),
        verified(options, isPresent).lifetime
      );

  setupResource(resource);

  return resource;
}

export declare const ResourceBrand: unique symbol;
export type Resource<T = unknown> = FormulaFn<T> & {
  [ResourceBrand]: true;
};
export const Resource = ResourceBlueprintImpl.create;

export { isResource } from "./resource.js";

export type ResourceBlueprint<T = unknown> = ResourceBlueprintImpl<T>;

export type IntoResourceBlueprint<T> =
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;

export function IntoResourceBlueprint<T>(
  value: IntoResourceBlueprint<T>
): ResourceBlueprint<T> {
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
