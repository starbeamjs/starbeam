import { DEBUG } from "@starbeam/reactive";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import * as resource from "@starbeam/resource";
import { service as createService } from "@starbeam/service";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export function setup<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "setup"]);
  return useMemo(() => {
    const owner = verified(getCurrentComponent(), isPresent);
    return resource.use(blueprint, { lifetime: owner });
  }, []).read();
}

export function service<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "service"]);
  return useMemo(() => {
    return createService(blueprint);
  }, []).read();
}
