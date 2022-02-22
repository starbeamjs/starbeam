import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
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
//# sourceMappingURL=program-node.js.map