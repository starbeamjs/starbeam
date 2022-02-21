import { assert } from "../../strippable/core.js";
import { ConfigEnvironment, } from "./config.js";
export const STARBEAM_ENV = Symbol.for("starbeam.config.env");
const GLOBAL = globalThis;
class GlobalConfig {
    hasConfig() {
        return Object.isExtensible(globalThis);
    }
    getConfig() {
        assert(Object.isExtensible(globalThis), `Starbeam does not currently support frozen globals, but we expect this to change.`);
        let env = GLOBAL[STARBEAM_ENV];
        if (!env) {
            env = {};
            Object.defineProperty(GLOBAL, STARBEAM_ENV, {
                enumerable: false,
                configurable: true,
                writable: false,
                value: env,
            });
        }
        return env;
    }
    insert(state, insertion) {
        state[insertion.key] = insertion.value;
    }
    parse(state, parseKey) {
        return state[parseKey.key];
    }
    description(_state, { key }) {
        return `global[STARBEAM_ENV].${key}`;
    }
}
export const GLOBAL_CONFIG = ConfigEnvironment.create(new GlobalConfig());
//# sourceMappingURL=global-config.js.map