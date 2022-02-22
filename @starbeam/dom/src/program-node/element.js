import { NonemptyList, Reactive, ReactiveMetadata } from "@starbeam/core";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import { ElementBodyConstructor, ElementHeadConstructor, TreeConstructor, } from "../dom/streaming/tree-constructor.js";
import { AttributeProgramNode, RenderedAttribute } from "./attribute.js";
import { ContentProgramNode } from "./content.js";
import { TextProgramNode } from "./data.js";
import { FragmentProgramNode, RenderedFragmentNode } from "./fragment.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
export class ElementProgramNode extends ContentProgramNode {
    static create(tagName, buildAttributes, content) {
        let attributes = buildAttributes.map(AttributeProgramNode.create);
        // A static element may still need to be moved
        return new ElementProgramNode(tagName, attributes, FragmentProgramNode.of(NonemptyList.verified(content)));
    }
    #tagName;
    #attributes;
    #children;
    constructor(tagName, attributes, children) {
        super();
        this.#tagName = tagName;
        this.#attributes = attributes;
        this.#children = children;
    }
    get metadata() {
        return ReactiveMetadata.all(this.#tagName, this.#children, ...this.#attributes);
    }
    render(buffer) {
        return buffer.element(this.#tagName.current, (head) => DehydratedElementBuilder.create(this.#tagName, head)
            .attrs(this.#attributes)
            .body(this.#children), (token, builder) => builder.finalize(token));
    }
}
class DehydratedElementBuilder {
    static create(tag, head) {
        return new DehydratedElementBuilder(tag, head, [], null);
    }
    #tag;
    #head;
    #attributes;
    #content;
    constructor(tag, head, attributes, content) {
        this.#tag = tag;
        this.#head = head;
        this.#attributes = attributes;
        this.#content = content;
    }
    attrs(nodes) {
        for (let node of nodes) {
            let attribute = node.render(this.#head);
            if (attribute) {
                this.#attributes.push(attribute);
            }
        }
        return this;
    }
    empty(type = "normal") {
        this.#head.empty(type);
        return this;
    }
    body(children) {
        let body = this.#head.body();
        this.#content = children.render(body);
        ElementBodyConstructor.flush(body);
        return this;
    }
    finalize(token) {
        if (token) {
            return RenderedElementNode.create(token.dom, this.#tag, this.#attributes, this.#content);
        }
        else {
            return {
                attributes: this.#attributes,
                content: this.#content,
            };
        }
    }
}
export class RenderedElementNode extends RenderedContent {
    static create(node, tagName, attributes, children) {
        return new RenderedElementNode(node, tagName, attributes, children);
    }
    #element;
    #tagName;
    #attributes;
    #children;
    constructor(node, tagName, attributes, children) {
        super();
        this.#element = node;
        this.#tagName = tagName;
        this.#attributes = attributes;
        this.#children = children;
    }
    get metadata() {
        return ReactiveMetadata.all(this.#tagName, ...(this.#children ? [this.#children] : []), ...this.#attributes);
    }
    [RANGE_SNAPSHOT](inside) {
        return RangeSnapshot.create(this.#element.environment, this.#element.get(inside));
    }
    initialize(inside) {
        this.#element.get(inside);
        for (let attr of this.#attributes) {
            attr.initialize(inside);
        }
        if (this.#children) {
            this.#children.initialize(inside);
        }
    }
    poll(inside) {
        if (this.#tagName.isDynamic()) {
            throw new Error("Dynamic tag name");
        }
        let element = this.#element.get(inside);
        this.#attributes = this.#attributes.filter((attr) => attr.isDynamic());
        for (let attr of this.#attributes) {
            attr.poll(element);
        }
        if (this.#children !== null && this.#children.isConstant()) {
            this.#children = null;
        }
        if (this.#children) {
            this.#children.poll(element);
        }
    }
}
export class ElementProgramNodeBuilder {
    static build(tagName, build) {
        let builder = new ElementProgramNodeBuilder(tagName);
        build(builder);
        return builder.finalize();
    }
    #tagName;
    #children = [];
    #attributes = [];
    constructor(tagName) {
        this.#tagName = tagName;
    }
    append(output) {
        if (typeof output === "string") {
            this.#children.push(TextProgramNode.of(Reactive.from(output)));
        }
        else {
            this.#children.push(output);
        }
        return this;
    }
    attribute(attribute) {
        this.#attributes.push(attribute);
        return this;
    }
    finalize() {
        return ElementProgramNode.create(this.#tagName, this.#attributes, this.#children);
    }
}
//# sourceMappingURL=element.js.map