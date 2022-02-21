/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cell, enumerate, HookBlueprint, Reactive, } from "@starbeam/core";
import { use } from "./hooks.js";
export function hookify(hook, description = hook.name || `(anonymous hook)`) {
    let stableArgs;
    return ((...args) => {
        if (stableArgs === undefined) {
            stableArgs = args.map((arg, i) => Cell(arg, `${description} (param ${i + 1})`));
        }
        for (let [i, arg] of enumerate(args)) {
            if (Reactive.is(arg)) {
                continue;
            }
            stableArgs[i].update(arg);
        }
        return use(hook(...stableArgs));
    });
}
//# sourceMappingURL=hookify.js.map