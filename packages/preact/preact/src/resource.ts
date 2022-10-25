import type { Factory } from "@starbeam/universal";
import {
  type Resource,
  type ResourceBlueprint,
  Service,
} from "@starbeam/universal";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function use<T>(blueprint: ResourceBlueprint<T>): T {
  return useMemo((): Resource<T> => {
    const owner = verified(getCurrentComponent(), isPresent);

    return blueprint.create(owner);
  }, []).current;
}

export function service<T>(service: Factory<T>): T {
  return Service.create(service).current;
}
