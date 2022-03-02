import { ENV_VAR_CONFIG } from "./src/env-var-config.js";
import { GLOBAL_CONFIG } from "./src/global-config.js";

function getConfig() {
  if (ENV_VAR_CONFIG.isPresent) {
    return ENV_VAR_CONFIG;
  } else {
    return GLOBAL_CONFIG;
  }
}

export const CONFIG = getConfig();
export { Priority } from "./src/config.js";
export { ENV_VAR_CONFIG, GLOBAL_CONFIG };
