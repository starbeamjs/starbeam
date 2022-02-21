import { HasMetadata } from "../core/metadata.js";
let ID = 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class ExtendsReactive extends HasMetadata {
    #id = ID++;
    #inspect;
    constructor(inspect) {
        super();
        this.#inspect = { ...inspect, id: this.#id };
        Object.defineProperty(this, inspect.name, {
            enumerable: true,
            configurable: true,
            writable: false,
            value: this.#id,
        });
        Object.defineProperty(this, "at", {
            enumerable: true,
            configurable: true,
            writable: false,
            value: this.#inspect.description,
        });
        Object.defineProperty(this, "compute", {
            enumerable: true,
            configurable: true,
            get() {
                return this.current;
            },
        });
    }
    toString() {
        return `(${this.#id}) ${this.#inspect.name} (${this.#inspect.description}) `;
    }
}
//# sourceMappingURL=base.js.map