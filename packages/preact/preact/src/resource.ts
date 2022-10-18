import { useMemo } from "preact/hooks";
import { Resource, type ResourceBlueprint } from "@starbeam/core";
import { getCurrentComponent } from "./options.js";
import { verified, isPresent } from "@starbeam/verify";

export function use<T>(blueprint: ResourceBlueprint<T>): T {
  return useMemo((): Resource<T> => {
    const owner = verified(getCurrentComponent(), isPresent);

    return Resource.create(blueprint, { owner });
  }, []).current;
}
