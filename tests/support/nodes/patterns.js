import zip from "lodash.zip";
import { Abstraction, DOM, exhaustive, is, verified, verify } from "starbeam";
export function ElementNode(tagName, options) {
    return {
        type: "element",
        tagName,
        options,
    };
}
export function TextNode(value) {
    return {
        type: "text",
        value,
    };
}
export function expectNode(actual, pattern) {
    switch (pattern.type) {
        case "text": {
            expect(actual).toMatchObject({
                nodeType: 3,
                nodeValue: pattern.value,
            });
            break;
        }
        case "comment": {
            expect(actual).toMatchObject({ nodeType: 8, nodeValue: pattern.value });
            break;
        }
        case "element": {
            verify(actual, is.Element);
            expectElement(actual, pattern.tagName, pattern.options);
            break;
        }
        default: {
            exhaustive(pattern, "NodePattern");
        }
    }
}
export function expectElement(node, tagName, options) {
    Abstraction.wrap(() => expect(`<${node.tagName.toLowerCase()}>`, `element should be a <${tagName}>`).toBe(`<${tagName.toLowerCase()}>`));
    if (options?.attributes) {
        for (let [name, value] of Object.entries(options.attributes)) {
            Abstraction.wrap(() => expect(DOM.getAttr(node, name), `attribute ${name} should be ${value}`).toBe(value));
        }
    }
    Abstraction.wrap(() => {
        if (options?.children) {
            let children = DOM.children(node);
            expect(children, "options.children should be the same length as the element's childNodes").toHaveLength(options.children.length);
            for (let [childNode, pattern] of zip(children, options.children)) {
                Abstraction.wrap(() => expectNode(verified(childNode, is.Present), verified(pattern, is.Present)));
            }
        }
    });
}
//# sourceMappingURL=patterns.js.map