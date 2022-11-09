import type { ResourceBlueprint } from "@starbeam/universal";
import { Factory } from "@starbeam/universal";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function use<T, Default extends undefined>(
  blueprint:
    | ResourceBlueprint<T, Default>
    | (() => ResourceBlueprint<T, Default>)
): T {
  return useMemo(() => {
    const owner = verified(getCurrentComponent(), isPresent);
    return Factory.resource(blueprint, owner);
  }, []).current;
}
