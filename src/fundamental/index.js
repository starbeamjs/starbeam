import { ENV_VAR_CONFIG } from "./env-var-config.js";
import { GLOBAL_CONFIG } from "./global-config.js";
export function getConfig() {
    if (ENV_VAR_CONFIG.isPresent) {
        return ENV_VAR_CONFIG;
    }
    else {
        return GLOBAL_CONFIG;
    }
}
//# sourceMappingURL=index.js.map