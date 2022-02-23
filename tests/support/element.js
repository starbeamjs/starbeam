import { Reactive } from "@starbeam/core";
export function isIntoReactive(value) {
    if (Reactive.is(value)) {
        return true;
    }
    else if (value === null || typeof value === "string") {
        return true;
    }
    else {
        return false;
    }
}
export function isReactiveAttribute(attribute) {
    return Reactive.is(attribute.value);
}
export class ElementArgs {
    universe;
    static normalize(universe, options) {
        return new ElementArgs(universe).#normalizeElementArgs(options);
    }
    constructor(universe) {
        this.universe = universe;
    }
    #normalizeElementArgs(args) {
        if (isNormalized(args)) {
            let [tagName, callback, expectation] = args;
            return { tagName, build: callback, expectation };
        }
        else {
            let [intoTagName, intoOptions, expectation] = args;
            let tagName = Reactive.from(intoTagName);
            let build = this.#normalizeOptions(intoOptions);
            return { tagName, build, expectation };
        }
    }
    #normalizeOptions({ attributes, children, }) {
        let normalizedChildren = children?.map((c) => normalizeChild(this.universe, c)) ?? [];
        let normalizedAttributes = attributes
            ? Object.entries(attributes).map((a) => this.#normalizeAttribute(a))
            : [];
        return (b) => {
            for (let attribute of normalizedAttributes) {
                b.attribute(attribute);
            }
            for (let child of normalizedChildren) {
                b.append(child);
            }
        };
    }
    #normalizeAttribute([name, attribute]) {
        if (isIntoReactive(attribute)) {
            let value = Reactive.from(attribute);
            return { name: name, value };
        }
        else if (isReactiveAttribute(attribute)) {
            return attribute;
        }
        else {
            let { name, value } = attribute;
            return {
                name,
                value: Reactive.from(value),
            };
        }
    }
}
export function normalizeChild(universe, child) {
    if (typeof child === "string") {
        return universe.dom.text(Reactive.from(child));
    }
    else {
        return child;
    }
}
function isNormalized(args) {
    return typeof args[1] === "function";
}
//# sourceMappingURL=element.js.map