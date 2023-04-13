import type { IntoResourceBlueprint } from "@starbeam/resource";
import * as resource from "@starbeam/resource";
import { service as createService } from "@starbeam/service";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function use<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useMemo(() => {
    const owner = verified(getCurrentComponent(), isPresent);
    return resource.use(blueprint, { lifetime: owner });
  }, []).current;
}

export function service<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useMemo(() => {
    return createService(blueprint);
  }, []).current;
}
