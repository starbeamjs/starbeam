import { verified } from "./strippable/assert.js";
import { has } from "./strippable/minimal.js";
import { as } from "./strippable/verify-context.js";
export const INSPECT = Symbol.for("nodejs.util.inspect.custom");
export function isObject(value) {
    return typeof value === "object" && value !== null;
}
export function* enumerate(iterable) {
    let i = 0;
    for (let item of iterable) {
        yield [i++, item];
    }
}
export const Position = {
    hasNext(position) {
        return position === "first" || position === "middle";
    },
    hasPrev(position) {
        return position === "last" || position === "middle";
    },
};
const EMPTY = {
    isEmpty: true,
};
const PRESENT = {
    isEmpty: false,
};
export function* positioned(iterable) {
    let iterator = iterable[Symbol.iterator]();
    let first = iterator.next();
    let buffer;
    let yieldedFirst = false;
    if (first.done) {
        return EMPTY;
    }
    else {
        buffer = first.value;
    }
    for (let next = iterator.next(); !next.done;) {
        let current = buffer;
        buffer = next.value;
        if (yieldedFirst) {
            yield [current, "middle"];
        }
        else {
            yield [current, "first"];
        }
    }
    if (yieldedFirst) {
        yield [buffer, "last"];
    }
    else {
        yield [buffer, "only"];
    }
    return PRESENT;
}
export class NonemptyList {
    static of(list) {
        return new NonemptyList(list);
    }
    static verified(list) {
        return NonemptyList.of(verified(list, has.items, as(`non-empty list`)));
    }
    #list;
    constructor(list) {
        this.#list = list;
    }
    [Symbol.iterator]() {
        return this.#list[Symbol.iterator]();
    }
    asArray() {
        return this.#list;
    }
    pushing(...content) {
        return new NonemptyList([...this.#list, ...content]);
    }
    takeBack() {
        let item = this.#list.pop();
        return [this.#list, item];
    }
    takeFront() {
        let item = this.#list.shift();
        return [item, this.#list];
    }
    *reversed() {
        for (let i = this.#list.length - 1; i >= 0; i--) {
            yield this.#list[i];
        }
    }
    get first() {
        return this.#list[0];
    }
    get last() {
        return this.#list[this.#list.length - 1];
    }
}
export function tap(value, updates) {
    updates(value);
    return value;
}
export class Pipe {
    value;
    static of(value) {
        return new Pipe(value);
    }
    constructor(value) {
        this.value = value;
    }
    to(pipe) {
        let piped = pipe(this.value);
        return Pipe.of(piped);
    }
}
export function pipe(value) {
    return Pipe.of(value);
}
//# sourceMappingURL=utils.js.map