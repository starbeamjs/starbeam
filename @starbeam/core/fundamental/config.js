import { ENV_VAR_CONFIG } from "./config/env-var-config.js";
import { GLOBAL_CONFIG } from "./config/global-config.js";
function getConfig() {
    if (ENV_VAR_CONFIG.isPresent) {
        return ENV_VAR_CONFIG;
    }
    else {
        return GLOBAL_CONFIG;
    }
}
export const CONFIG = getConfig();
export { ENV_VAR_CONFIG, GLOBAL_CONFIG };
//# sourceMappingURL=config.js.map