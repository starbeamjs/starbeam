import type {
  ResourceBlueprint,
  ResourceConstructor,
  SyncFn,
} from "@starbeam/resource";
import { setupResource } from "@starbeam/resource";
import { pushingScope } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";

export type IntoResourceBlueprint<T> =
  | ResourceBlueprint<T>
  | ResourceConstructor<T>;

export function intoResourceBlueprint<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
): ResourceBlueprint<T> {
  return typeof intoBlueprint === "function" ? intoBlueprint() : intoBlueprint;
}

export type ElementResourceBlueprint<E extends object, T> = (
  element: E,
) => IntoResourceBlueprint<T>;

export interface ElementResourceInstance<T> {
  readonly sync: SyncFn<void>;
  readonly value: T;
  readonly finalize: () => void;
}

export function setupElementResource<E extends object, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  element: E,
): ElementResourceInstance<T> {
  const [scope, resource] = pushingScope(() =>
    setupResource(blueprint(element)),
  );

  return {
    sync: resource.sync,
    value: resource.value,
    finalize: () => finalize(scope),
  };
}
