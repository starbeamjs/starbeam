import { createStorage, getValue, setValue, } from "./tracked-shim.js";
export class TrackedSet {
    #collection = createStorage(null, () => false);
    #storages = new Map();
    #vals;
    #storageFor(key) {
        const storages = this.#storages;
        let storage = storages.get(key);
        if (storage === undefined) {
            storage = createStorage(null, () => false);
            storages.set(key, storage);
        }
        return storage;
    }
    #dirtyStorageFor(key) {
        const storage = this.#storages.get(key);
        if (storage) {
            setValue(storage, null);
        }
    }
    constructor(existing) {
        this.#vals = new Set(existing);
    }
    // **** KEY GETTERS ****
    has(value) {
        getValue(this.#storageFor(value));
        return this.#vals.has(value);
    }
    // **** ALL GETTERS ****
    entries() {
        getValue(this.#collection);
        return this.#vals.entries();
    }
    keys() {
        getValue(this.#collection);
        return this.#vals.keys();
    }
    values() {
        getValue(this.#collection);
        return this.#vals.values();
    }
    forEach(fn) {
        getValue(this.#collection);
        this.#vals.forEach(fn);
    }
    get size() {
        getValue(this.#collection);
        return this.#vals.size;
    }
    [Symbol.iterator]() {
        getValue(this.#collection);
        return this.#vals[Symbol.iterator]();
    }
    get [Symbol.toStringTag]() {
        return this.#vals[Symbol.toStringTag];
    }
    // **** KEY SETTERS ****
    add(value) {
        this.#dirtyStorageFor(value);
        setValue(this.#collection, null);
        this.#vals.add(value);
        return this;
    }
    delete(value) {
        this.#dirtyStorageFor(value);
        setValue(this.#collection, null);
        return this.#vals.delete(value);
    }
    // **** ALL SETTERS ****
    clear() {
        this.#storages.forEach((s) => setValue(s, null));
        setValue(this.#collection, null);
        this.#vals.clear();
    }
}
// So instanceof works
Object.setPrototypeOf(TrackedSet.prototype, Set.prototype);
export class TrackedWeakSet {
    #storages = new WeakMap();
    #vals;
    #storageFor(key) {
        const storages = this.#storages;
        let storage = storages.get(key);
        if (storage === undefined) {
            storage = createStorage(null, () => false);
            storages.set(key, storage);
        }
        return storage;
    }
    #dirtyStorageFor(key) {
        const storage = this.#storages.get(key);
        if (storage) {
            setValue(storage, null);
        }
    }
    constructor(values) {
        this.#vals = new WeakSet(values);
    }
    has(value) {
        getValue(this.#storageFor(value));
        return this.#vals.has(value);
    }
    add(value) {
        // Add to vals first to get better error message
        this.#vals.add(value);
        this.#dirtyStorageFor(value);
        return this;
    }
    delete(value) {
        this.#dirtyStorageFor(value);
        return this.#vals.delete(value);
    }
    get [Symbol.toStringTag]() {
        return this.#vals[Symbol.toStringTag];
    }
}
// So instanceof works
Object.setPrototypeOf(TrackedWeakSet.prototype, WeakSet.prototype);
//# sourceMappingURL=set.js.map