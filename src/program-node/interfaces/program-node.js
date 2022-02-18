import { HasMetadata, ReactiveMetadata } from "../../core/metadata.js";
export class RenderedProgramNode extends HasMetadata {
}
// export type RenderedProgramNode = RenderedContent | RenderedAttribute;
export class AbstractProgramNode extends HasMetadata {
    isConstant() {
        return this.metadata.isConstant();
    }
    isDynamic() {
        return this.metadata.isDynamic();
    }
}
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
//# sourceMappingURL=program-node.js.map