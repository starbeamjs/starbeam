import { nodeName } from "./node.js";
import { Described, PatternMatch, PatternMismatch, } from "../../expect.js";
import { Success, Mismatch, Multiple, ValueDescription, } from "../../report.js";
import zip from "lodash.zip";
function MissingNode(expected) {
    return { type: "missing-node", expected };
}
function ExtraNode(node) {
    return {
        type: "extra-node",
        node,
    };
}
function WrongNodeType(actual) {
    return PatternMismatch({
        type: "wrong-node-type",
        actual,
    });
}
function failuresForDetails(details) {
    let failures = [];
    let { tagName, attributes, children } = details;
    if (tagName) {
        failures.push(Mismatch({
            description: "the element's tag name",
            actual: ValueDescription(tagName.actual),
            expected: ValueDescription(tagName.expected),
        }));
    }
    if (attributes) {
        for (let [name, failure] of Object.entries(attributes)) {
            failures.push(Mismatch({
                description: `the ${name} attribute`,
                actual: ValueDescription(failure.actual),
                expected: ValueDescription(failure.expected),
            }));
        }
    }
    if (children) {
        throw Error("todo: children in failuresForDetails");
    }
    return failures;
}
class WrongDetailsBuilder {
    #tagName = undefined;
    #attributes = undefined;
    #children = [];
    verifyTagName(actual, expected) {
        if (actual !== expected) {
            this.#tagName = { actual, expected };
        }
    }
    #getAttributes() {
        if (this.#attributes === undefined) {
            this.#attributes = {};
        }
        return this.#attributes;
    }
    verifyAttribute(name, actual, expected) {
        if (actual === expected) {
            return;
        }
        this.#getAttributes()[name] = { actual, expected };
    }
    verifyChildren(actual, expected) {
        let described = Described.from(actual);
        let zipped = zip(described.value.childNodes, expected);
        for (let [actual, pattern] of zipped) {
            if (pattern === undefined && actual !== undefined) {
                this.#children.push(PatternMismatch(ExtraNode(actual)));
                continue;
            }
            if (pattern !== undefined && actual === undefined) {
                this.#children.push(PatternMismatch(MissingNode(pattern)));
                continue;
            }
            if (pattern !== undefined && actual !== undefined) {
                let result = pattern.check(Described.from(actual));
                this.#children.push(result);
            }
            if (pattern === undefined && actual === undefined) {
                throw Error("unreachable: zip() yielded undefined for both values, and the arrays passed zip() cannot contain undefined");
            }
        }
    }
    finalize() {
        let hasInvalidChildren = this.#children.some((c) => c.type === "mismatch");
        if (this.#tagName === undefined &&
            this.#attributes === undefined &&
            !hasInvalidChildren) {
            return PatternMatch();
        }
        else {
            let failure = {
                type: "wrong-element-details",
            };
            if (this.#tagName) {
                failure.tagName = this.#tagName;
            }
            if (this.#attributes) {
                failure.attributes = this.#attributes;
            }
            if (hasInvalidChildren) {
                failure.children = this.#children;
            }
            return PatternMismatch(failure);
        }
    }
}
export class SimpleElementPattern {
    options;
    details;
    constructor(options, scenario) {
        this.options = options;
        this.details = {
            name: "isElement",
            description: options.tagName
                ? `is a <${options.tagName}>`
                : `is an element`,
            scenario,
        };
    }
    when(scenario) {
        return new SimpleElementPattern(this.options, scenario);
    }
    check({ value: node, }) {
        if (node.nodeType !== 1) {
            return WrongNodeType(node.nodeType);
        }
        let failure = new WrongDetailsBuilder();
        let { tagName, attributes, children } = this.options;
        if (tagName) {
            failure.verifyTagName(node.tagName.toLowerCase(), tagName.toLowerCase());
        }
        if (attributes) {
            for (let [name, expected] of Object.entries(attributes)) {
                failure.verifyAttribute(name, node.getAttribute(name), expected);
            }
        }
        if (children) {
            failure.verifyChildren(node, children);
        }
        let result = failure.finalize();
        if (result === null) {
            return PatternMatch();
        }
        else {
            return result;
        }
    }
    success() {
        return Success({
            pattern: this.details,
            message: `the element matched`,
        });
    }
    failure(_actual, failure) {
        if (failure.type === "wrong-node-type") {
            return Mismatch({
                actual: ValueDescription(nodeName(failure.actual)),
                expected: ValueDescription(this.options.tagName ? `<${this.options.tagName}>` : `Element`),
                pattern: this.details,
            });
        }
        return Multiple({
            message: `the element didn't match`,
            pattern: this.details,
            failures: failuresForDetails(failure),
        });
    }
}
//# sourceMappingURL=element.js.map