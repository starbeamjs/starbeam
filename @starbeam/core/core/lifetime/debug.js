import { tree, TreeContent, TreeRecord } from "../../debug/tree.js";
import { isObject } from "../../utils.js";
// const INSPECT = Symbol.for("nodejs.util.inspect.custom");
export class DebugFinalizer {
    static create(finalizer, token) {
        return new DebugFinalizer(finalizer, token);
    }
    #finalizer;
    #token;
    constructor(finalizer, token) {
        this.#finalizer = finalizer;
        this.#token = token;
    }
    get finalizer() {
        return this.#finalizer;
    }
    get token() {
        return this.#token;
    }
    treeify() {
        if (this.#token === undefined) {
            return tree.value(`Finalizer(${this.#finalizer})`);
        }
        else {
            return tree.value(`Finalizer(${this.#finalizer}, token: ${this.#token})`);
        }
    }
}
function hasToJSON(value) {
    if (!isObject(value))
        return false;
    if ("toJSON" in value) {
        return typeof value.toJSON === "function";
    }
    return false;
}
function hasNonemptyConstructor(value) {
    if (!isObject(value))
        return false;
    if ("constructor" in value) {
        let constructor = value.constructor;
        if (typeof constructor !== "function")
            return false;
        return typeof constructor.name === "string" && constructor.name.length > 0;
    }
    return false;
}
function stringify(json) {
    if (Array.isArray(json)) {
        return `[ ` + json.map(stringify).join(", ") + ` ]`;
    }
    if (typeof json === "object" && json !== null) {
        return (`{ ` +
            Object.entries(json).map(([key, value]) => `${key}: ${stringify(value)}`) +
            ` }`);
    }
    return String(json);
}
function inspectObject(value) {
    if (hasNonemptyConstructor(value)) {
        if (hasToJSON(value)) {
            return `${value.constructor.name} ${stringify(value.toJSON())}`;
        }
        else {
            return `#<${value.constructor.name}>`;
        }
    }
    else if (hasToJSON(value)) {
        return stringify(value.toJSON());
    }
    else {
        return `(anonymous)`;
    }
}
export class DebugObjectLifetime {
    static create(object, finalizers, children) {
        return new DebugObjectLifetime(object, finalizers, children);
    }
    #object;
    #finalizers;
    #children;
    constructor(object, finalizers, children) {
        this.#object = object;
        this.#finalizers = finalizers;
        this.#children = children;
    }
    get object() {
        return this.#object;
    }
    get finalizers() {
        return [...this.#finalizers];
    }
    get children() {
        return [...this.#children];
    }
    tree() {
        return tree((t) => t.entry("DebugObjectLifetime", (b) => b
            .entry("object", inspectObject(this.#object))
            .list("children", [...this.#children].map((child) => child.tree()))
            .list("finalizers", [...this.#finalizers].map((finalizer) => finalizer.treeify()), "None")));
    }
}
//# sourceMappingURL=debug.js.map