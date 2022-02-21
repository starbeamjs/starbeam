import { Abstraction } from "./abstraction.js";
/** @internal */
export const assertCondition = abstractify((condition, info) => {
    if (condition === true) {
        return;
    }
    // eslint-disable-next-line no-debugger
    debugger;
    let message = `Unexpected: ${DebugInformation.message(info())}`;
    console.assert(condition, message);
    Abstraction.throw(message);
});
/**
 * @strip.noop
 */
export function assert(condition, info = "assertion error") {
    assertCondition(condition, () => info);
}
export function isVerifyContext(context) {
    return typeof context.expected === "string";
}
export const DebugInformation = {
    message,
};
function message(info, defaultValue) {
    if (info === undefined) {
        return message(defaultValue);
    }
    else if (typeof info === "string") {
        return info;
    }
    else {
        return info.message;
    }
}
export const narrow = abstractify((value, predicate) => {
    predicate(value);
    return value;
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function abstractify(f) {
    return ((...args) => {
        let start = Abstraction.start();
        try {
            let result = f(...args);
            Abstraction.end(start);
            return result;
        }
        catch (e) {
            Abstraction.end(start, e);
        }
    });
}
//# sourceMappingURL=core.js.map