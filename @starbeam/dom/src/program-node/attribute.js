import { AbstractProgramNode, RenderedProgramNode, } from "../../../core/program-node/program-node.js";
import { DOM } from "../dom/streaming/compatible-dom.js";
import { LazyDOM } from "../dom/streaming/token.js";
import { ElementHeadConstructor, TOKEN, } from "../dom/streaming/tree-constructor.js";
export class AttributeProgramNode extends AbstractProgramNode {
    static create(attribute) {
        return new AttributeProgramNode(attribute);
    }
    #attribute;
    constructor(attribute) {
        super();
        this.#attribute = attribute;
    }
    get metadata() {
        return this.#attribute.value.metadata;
    }
    render(buffer) {
        let value = this.#attribute.value;
        // let value = this.#attribute.value.current;
        let attr = buffer.attr(this.#attribute.name, value.current, TOKEN);
        return RenderedAttribute.create(LazyDOM.create(buffer.environment, attr), value);
    }
}
export class RenderedAttribute extends RenderedProgramNode {
    static create(attribute, value) {
        return new RenderedAttribute(attribute, value);
    }
    #attribute;
    #value;
    constructor(attribute, value) {
        super();
        this.#attribute = attribute;
        this.#value = value;
    }
    get metadata() {
        return this.#value.metadata;
    }
    initialize(inside) {
        this.#attribute.get(inside);
    }
    poll(inside) {
        DOM.updateAttr(this.#attribute.get(inside), this.#value.current);
    }
}
//# sourceMappingURL=attribute.js.map