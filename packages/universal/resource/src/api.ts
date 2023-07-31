import type { ResourceConstructor } from "./resource.js";
import {
  isResourceBlueprint,
  Resource,
  type ResourceBlueprint,
} from "./resource.js";

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
