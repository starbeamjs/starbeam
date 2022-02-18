export class Brand {
    #reactive = new WeakMap();
    brand(object) {
        this.#reactive.set(object, true);
    }
    is(object) {
        return this.#reactive.has(object);
    }
}
export const REACTIVE_BRAND = new Brand();
export const PROGRAM_NODE_BRAND = new Brand();
//# sourceMappingURL=internal.js.map