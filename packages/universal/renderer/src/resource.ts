import type {
  ResourceBlueprint,
  ResourceConstructor,
} from "@starbeam/resource";

export type IntoResourceBlueprint<T, M = void> =
  | ResourceBlueprint<T, M>
  | ResourceConstructor<T, void>;
