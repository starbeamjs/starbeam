import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import { ContentConstructor, TOKEN, } from "../dom/streaming/tree-constructor.js";
import { mutable } from "../strippable/minimal.js";
import { ContentProgramNode } from "./interfaces/program-node.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
export class CharacterDataProgramNode extends ContentProgramNode {
    static text(reactive) {
        return TextProgramNode.of(reactive);
    }
    static comment(reactive) {
        return CommentProgramNode.of(reactive);
    }
    #reactive;
    constructor(reactive) {
        super();
        this.#reactive = reactive;
    }
    get metadata() {
        return this.#reactive.metadata;
    }
    render(buffer) {
        let token = this.append(buffer, this.#reactive.current);
        return RenderedCharacterData.create(this.#reactive, token.dom);
    }
}
export class TextProgramNode extends CharacterDataProgramNode {
    static of(reactive) {
        return new TextProgramNode(reactive);
    }
    append(buffer, data) {
        return buffer.text(data, TOKEN);
    }
}
export class CommentProgramNode extends CharacterDataProgramNode {
    static of(reactive) {
        return new CommentProgramNode(reactive);
    }
    append(buffer, data) {
        return buffer.comment(data, TOKEN);
    }
}
export class RenderedCharacterData extends RenderedContent {
    static create(reactive, node) {
        return new RenderedCharacterData(reactive, node);
    }
    #reactive;
    #node;
    constructor(reactive, node) {
        super();
        this.#reactive = reactive;
        this.#node = node;
    }
    get metadata() {
        return this.#reactive.metadata;
    }
    initialize(inside) {
        this.#node.get(inside);
    }
    poll(inside) {
        mutable(this.#node.get(inside)).data = this.#reactive.current;
    }
    [RANGE_SNAPSHOT](inside) {
        return RangeSnapshot.create(this.#node.environment, this.#node.get(inside));
    }
}
//# sourceMappingURL=data.js.map