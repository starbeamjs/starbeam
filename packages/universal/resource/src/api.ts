import type { Description } from "@starbeam/interfaces";

import type { ResourceConstructor } from "./resource.js";
import {
  isResourceBlueprint,
  Resource,
  type ResourceBlueprint,
  type ResourceInstance,
} from "./resource.js";

export interface UseFnOptions {
  readonly description?: Description | undefined;
}

export interface SetupFnOptions extends UseFnOptions {
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
  intoBlueprint: IntoResourceBlueprint<T>,
  options?: UseFnOptions,
): ResourceInstance<T> {
  if (isResourceBlueprint(intoBlueprint)) {
    return intoBlueprint();
  } else {
    const blueprint = Resource(intoBlueprint);
    return blueprint();
  }
}

export declare const ResourceBrand: unique symbol;

export type IntoResourceBlueprint<T> =
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;

export function IntoResourceBlueprint<T>(
  value: IntoResourceBlueprint<T>,
): ResourceBlueprint<T> {
  if (isResourceBlueprint(value)) {
    return value;
  } else {
    return Resource(value);
  }
}
