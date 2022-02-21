import { exhaustive } from "../../strippable/assert.js";
import { assert } from "../../strippable/core.js";
import { ConfigEnvironment, } from "./config.js";
function keys(keys) {
    return keys;
}
const KEYS = keys({
    LogLevel: "LOG_LEVEL",
    TraceFocus: "TRACE_FOCUS",
});
export class EnvVarConfig {
    static create() {
        return new EnvVarConfig();
    }
    hasConfig() {
        return "process" in globalThis && !!globalThis.process.env;
    }
    getConfig() {
        assert("process" in globalThis && !!globalThis.process.env, `Expected configuration in node process (because hasConfig() returned true), but process.env was missing. Did you call getConfig() without first calling hasConfig()?`);
        return globalThis.process.env;
    }
    description(_state, { key }) {
        return `process.env.${pascalCase(key)}`;
    }
    insert(env, value) {
        switch (value.hint) {
            case "boolean":
            case "number":
                env[pascalCase(value.key)] = String(value.value);
                break;
            case "string":
                env[pascalCase(value.key)] = value.value;
                break;
            default:
                exhaustive(value);
        }
    }
    parse(env, parseKey) {
        let key = pascalCase(parseKey.key);
        switch (parseKey.hint) {
            case "boolean": {
                return key in env && env[key] !== "false";
            }
            case "number": {
                let number = env[key];
                return number === undefined ? undefined : Number(number);
            }
            case "string": {
                return env[key];
            }
            default:
                exhaustive(parseKey);
        }
    }
}
export const ENV_VAR_CONFIG = ConfigEnvironment.create(EnvVarConfig.create());
function pascalCase(string) {
    return string.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
}
//# sourceMappingURL=env-var-config.js.map