import type { Reactive } from "@starbeam/interfaces";

export class ResourceBlueprintBrand {
  static readonly #blueprints = new WeakSet<ResourceBlueprint<unknown>>();

  static brand<T>(
    blueprint: Unbranded<ResourceBlueprint<T>>
  ): ResourceBlueprint<T> {
    this.#blueprints.add(blueprint as ResourceBlueprint<T>);
    return blueprint as ResourceBlueprint<T>;
  }

  static has<T>(value: unknown): value is ResourceBlueprint<T> {
    return !!(
      value &&
      typeof value === "object" &&
      this.#blueprints.has(value as ResourceBlueprint<T>)
    );
  }
}

declare const BRAND: unique symbol;
type BRAND = typeof BRAND;
export type Branded<T, B> = T & { [BRAND]: B };

type Unbranded<B extends { [BRAND]: unknown }> = Omit<B, BRAND>;

export interface ResourceBlueprint<T> {
  create: (owner: object) => Reactive<T>;
  [BRAND]: typeof ResourceBlueprintBrand;
}
