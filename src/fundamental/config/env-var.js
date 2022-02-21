function keys(keys) {
    return keys;
}
const KEYS = keys(["LOG_LEVEL", "TRACE_FOCUS"]);
export function envVarConfig() {
    const config = process.env;
    return envVars(config, KEYS);
}
function envVars(record, keys) {
    let config = {};
    for (let envKey of keys) {
        let envValue = record[envKey];
        if (typeof envValue === "string") {
            let [key, value] = normalize(envKey, envValue);
            config[key] = value;
        }
    }
    return config;
}
function normalize(key, value) {
    if (key.endsWith("]")) {
        if (key.startsWith("[")) {
            return parseDict(key, value);
        }
        else {
            return parseArray(key, value);
        }
    }
    else {
        return [
            pascalCase(key),
            value,
        ];
    }
}
function parseDict(key, value) {
    throw Error("todo: Starbeam config dictionaries");
}
function parseArray(key, value) {
    throw Error("todo: Starbeam config dictionaries");
}
function pascalCase(string) {
    return string.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
}
//# sourceMappingURL=env-var.js.map