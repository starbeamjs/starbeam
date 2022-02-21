import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
const VARIANT = Symbol("VARIANT");
const VALUE = Symbol("VALUE");
export function Enum(...keys) {
    class Enum {
        #variant;
        #value;
        constructor(variant, value) {
            this.#variant = variant;
            this.#value = value;
        }
        match(matcher) {
            return matcher[this.#variant](this.#value);
        }
    }
    for (let discriminant of keys) {
        let { variant } = verified(discriminant.match(/^(?<variant>[^(]*)(?<generics>\([^)]*\))?$/), is.Present).groups;
        Object.defineProperty(Enum, variant, {
            enumerable: false,
            configurable: true,
            value(value) {
                return new this(variant, value);
            },
        });
    }
    return Enum;
}
//# sourceMappingURL=enumeration.js.map