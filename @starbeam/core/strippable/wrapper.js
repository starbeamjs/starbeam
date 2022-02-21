/**
 * Everything in this file is, in principle, strippable.
 */
/**
 * The strippable usage pattern is:
 *
 * ```ts
 * let name = QualifiedName("xlink:actuate");
 * console.log(Wrapper.getInner(name));
 * ```
 *
 * which is stripped to:
 *
 * ```ts
 * let name = "xlink:actuate";
 * console.log(name);
 * ```
 *
 * If you want to run code that is explicitly for debug-mode only, then you can
 * use this usage pattern:
 *
 * ```ts
 * let person = Wrapper.withMeta({ name: "Tom" }, { description: "Person" });
 * Wrapper.inDebug(person, (person, meta) => {
 *   console.group(meta.description);
 *   console.log(`%cName:%c ${person.name}`, "color: red", "color: black");
 *   console.groupEnd();
 * })
 * ```
 *
 * Which gets stripped to:
 *
 * ```ts
 * let person = { name: "Tom" };
 * ```
 */
export class Wrapper {
    static of(value, symbol) {
        return new Wrapper(null, symbol, value);
    }
    static withMeta(value, meta, symbol) {
        return new Wrapper(meta, symbol, value);
    }
    /**
     * @strip.value newtype
     */
    static getInner(newtype) {
        return newtype.#inner;
    }
    /**
     * @strip.noop
     */
    static inDebug(newtype, callback) {
        callback(newtype.#inner, newtype.#debugMeta);
    }
    #debugMeta;
    // Unused field for nominal typing
    #symbol;
    #inner;
    constructor(debugMeta, symbol, inner) {
        this.#debugMeta = debugMeta;
        this.#symbol = symbol;
        this.#inner = inner;
    }
}
const QUALIFIED_NAME = Symbol("QUALIFIED_NAME");
/**
 * @strip.value name
 */
export function QualifiedName(name) {
    return Wrapper.withMeta(name, { description: "QualifiedName" }, QUALIFIED_NAME);
}
const LOCAL_NAME = Symbol("LOCAL_NAME");
/**
 * @strip.value name
 */
export function LocalName(name) {
    return Wrapper.withMeta(name, { description: "LocalName" }, LOCAL_NAME);
}
//# sourceMappingURL=wrapper.js.map