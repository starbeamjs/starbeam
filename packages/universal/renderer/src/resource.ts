import type {
  ResourceBlueprint,
  ResourceConstructor,
} from "@starbeam/resource";

export type IntoResourceBlueprint<T> =
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;
