import { Cell } from "../cell.js";
import { ReactiveMemo } from "../memo.js";
import { TrackedArray } from "./array.js";
import { TrackedMap, TrackedWeakMap } from "./map.js";
import TrackedObject from "./object.js";
import { TrackedSet, TrackedWeakSet } from "./set.js";
const PRIMITIVE = [
    "  - a string",
    "  - a number",
    "  - a boolean",
    "  - a symbol",
    "  - a bigint",
    "  - null",
    "  - undefined",
];
const OPTIONS = [
    "- an array literal",
    "- an object literal",
    "- Map",
    "- Set",
    "- WeakMap",
    "- WeakSet",
    "- a primitive (to create a cell)",
    ...PRIMITIVE,
].join("\n");
export function builtin(value) {
    if (Array.isArray(value)) {
        // freeze the array to prevent mutating it directly and expecting to see updates
        Object.freeze(value);
        return TrackedArray.from(value);
    }
    else if (value === Map) {
        return new TrackedMap();
    }
    else if (value === Set) {
        return new TrackedSet();
    }
    else if (value === WeakMap) {
        return new TrackedWeakMap();
    }
    else if (value === WeakSet) {
        return new TrackedWeakSet();
    }
    else if (typeof value === "function") {
        return ReactiveMemo.create(value, `(anonymous)`);
    }
    else if (isSimpleObject(value)) {
        // freeze the object to prevent mutating it directly and expecting to see updates
        Object.freeze(value);
        return TrackedObject.fromEntries(Object.entries(value));
    }
    else if (isPrimitive(value)) {
        return Cell(value);
    }
    else {
        console.trace(`you passed`, value);
        throw new Error(`You must call reactive() with:\n\n${OPTIONS}`);
    }
}
function isPrimitive(value) {
    if (value === null) {
        return true;
    }
    return typeof value !== "object" && typeof value !== "function";
}
function isSimpleObject(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    let proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}
//# sourceMappingURL=reactive.js.map