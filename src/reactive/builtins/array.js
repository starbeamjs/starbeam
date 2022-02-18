/* eslint-disable @typescript-eslint/no-explicit-any */
// Unfortunately, TypeScript's ability to do inference *or* type-checking in a
// `Proxy`'s body is very limited, so we have to use a number of casts `as any`
// to make the internal accesses work. The type safety of these is guaranteed at
// the *call site* instead of within the body: you cannot do `Array.blah` in TS,
// and it will blow up in JS in exactly the same way, so it is safe to assume
// that properties within the getter have the correct type in TS.
import { createStorage, getValue, setValue, } from "./tracked-shim.js";
const ARRAY_GETTER_METHODS = new Set([
    Symbol.iterator,
    "concat",
    "entries",
    "every",
    "fill",
    "filter",
    "find",
    "findIndex",
    "flat",
    "flatMap",
    "forEach",
    "includes",
    "indexOf",
    "join",
    "keys",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
    "values",
]);
function convertToInt(prop) {
    if (typeof prop === "symbol")
        return null;
    const num = Number(prop);
    if (isNaN(num))
        return null;
    return num % 1 === 0 ? num : null;
}
export class TrackedArray {
    static from(iterable, mapfn, thisArg) {
        return mapfn
            ? new TrackedArray(Array.from(iterable, mapfn, thisArg))
            : new TrackedArray(Array.from(iterable));
    }
    static of(...arr) {
        return new TrackedArray(arr);
    }
    constructor(arr = []) {
        let clone = arr.slice();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let self = this;
        let boundFns = new Map();
        return new Proxy(clone, {
            get(target, prop /*, _receiver */) {
                let index = convertToInt(prop);
                if (index !== null) {
                    self.#readStorageFor(index);
                    getValue(self.#collection);
                    return target[index];
                }
                else if (prop === "length") {
                    getValue(self.#collection);
                }
                else if (ARRAY_GETTER_METHODS.has(prop)) {
                    let fn = boundFns.get(prop);
                    if (fn === undefined) {
                        fn = (...args) => {
                            getValue(self.#collection);
                            return target[prop](...args);
                        };
                        boundFns.set(prop, fn);
                    }
                    return fn;
                }
                return target[prop];
            },
            set(target, prop, value /*, _receiver */) {
                target[prop] = value;
                let index = convertToInt(prop);
                if (index !== null) {
                    self.#dirtyStorageFor(index);
                    setValue(self.#collection, null);
                }
                else if (prop === "length") {
                    setValue(self.#collection, null);
                }
                return true;
            },
            getPrototypeOf() {
                return TrackedArray.prototype;
            },
        });
    }
    #collection = createStorage(null, () => false);
    #storages = new Map();
    #readStorageFor(index) {
        const storages = this.#storages;
        let storage = storages.get(index);
        if (storage === undefined) {
            storage = createStorage(null, () => false);
            storages.set(index, storage);
        }
        getValue(storage);
    }
    #dirtyStorageFor(index) {
        const storage = this.#storages.get(index);
        if (storage) {
            setValue(storage, null);
        }
    }
}
export default TrackedArray;
// Ensure instanceof works correctly
Object.setPrototypeOf(TrackedArray.prototype, Array.prototype);
//# sourceMappingURL=array.js.map