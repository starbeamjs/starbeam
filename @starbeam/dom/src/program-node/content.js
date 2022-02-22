import { AbstractProgramNode, HasMetadata, ReactiveMetadata, } from "@starbeam/core";
export class Rendered extends HasMetadata {
    content;
    static of(content) {
        return new Rendered(content);
    }
    constructor(content) {
        super();
        this.content = content;
    }
    get metadata() {
        return this.content.metadata;
    }
}
export class ContentProgramNode extends AbstractProgramNode {
}
//# sourceMappingURL=content.js.map