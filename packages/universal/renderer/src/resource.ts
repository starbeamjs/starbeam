import type {
  ResourceBlueprint,
  ResourceConstructor,
} from "@starbeam/resource";

export type IntoResourceBlueprint<T> =
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;

export function intoResourceBlueprint<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
): ResourceBlueprint<T> {
  return typeof intoBlueprint === "function" ? intoBlueprint() : intoBlueprint;
}
