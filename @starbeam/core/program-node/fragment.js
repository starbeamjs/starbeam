import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import { ReactiveMetadata } from "../core/metadata.js";
import { verify } from "../strippable/assert.js";
import { has } from "../strippable/minimal.js";
import { NonemptyList } from "../utils.js";
import { ContentProgramNode } from "./interfaces/program-node.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
export class FragmentProgramNode extends ContentProgramNode {
    static of(children) {
        return new FragmentProgramNode(children);
    }
    #children;
    constructor(children) {
        super();
        this.#children = children;
    }
    get metadata() {
        return ReactiveMetadata.all(...this.#children);
    }
    render(buffer) {
        let children = this.#children
            .asArray()
            .map((child) => child.render(buffer));
        return RenderedFragmentNode.create(children);
    }
}
export class RenderedFragmentNode extends RenderedContent {
    static create(children) {
        return new RenderedFragmentNode(children);
    }
    #content;
    constructor(content) {
        super();
        this.#content = content;
    }
    get metadata() {
        return ReactiveMetadata.all(...this.#content);
    }
    [RANGE_SNAPSHOT](inside) {
        verify(this.#content, has.items);
        let first = this.#content[0];
        let last = this.#content[this.#content.length - 1];
        return first[RANGE_SNAPSHOT](inside).join(last[RANGE_SNAPSHOT](inside));
    }
    poll(inside) {
        for (let content of this.#content) {
            content.poll(inside);
        }
    }
    initialize(inside) {
        for (let content of this.#content) {
            content.initialize(inside);
        }
    }
}
export class FragmentProgramNodeBuilder {
    static build(build) {
        let builder = new FragmentProgramNodeBuilder();
        build(builder);
        return builder.finalize();
    }
    #children = [];
    append(output) {
        this.#children.push(output);
        return this;
    }
    finalize() {
        return FragmentProgramNode.of(NonemptyList.verified(this.#children));
    }
}
//# sourceMappingURL=fragment.js.map