import { DEBUG } from "@starbeam/reactive";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import * as resource from "@starbeam/resource";
import { service as createService } from "@starbeam/service";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function setup<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useMemo(() => {
    const owner = verified(getCurrentComponent(), isPresent);
    return resource.use(blueprint, { lifetime: owner });
  }, []).read(DEBUG?.callerStack());
}

export function service<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useMemo(() => {
    return createService(blueprint);
  }, []).read(DEBUG?.callerStack());
}
