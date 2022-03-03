import type { ConfigEnvironment } from "./src/config.js";
import { ENV_VAR_CONFIG } from "./src/env-var-config.js";
import { GLOBAL_CONFIG } from "./src/global-config.js";

let CONFIG: ConfigEnvironment;

export function config() {
  if (!CONFIG) {
    if (ENV_VAR_CONFIG.isPresent) {
      CONFIG = ENV_VAR_CONFIG;
    } else {
      CONFIG = GLOBAL_CONFIG;
    }
  }

  return CONFIG;
}

export { Priority } from "./src/config.js";
export { ENV_VAR_CONFIG, GLOBAL_CONFIG };
