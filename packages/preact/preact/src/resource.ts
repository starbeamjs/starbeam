import type { IntoResource } from "@starbeam/universal";
import {
  type Blueprint,
  type ResourceFactory,
  Factory,
  Service,
} from "@starbeam/universal";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function use<T>(blueprint: IntoResource<T>): T {
  return useMemo(() => {
    const owner = verified(getCurrentComponent(), isPresent);
    return Factory.resource(blueprint, owner);
  }, []).current;
}

export function service<T>(factory: Blueprint<T> | ResourceFactory<T>): T {
  return Service.create(factory).current;
}
