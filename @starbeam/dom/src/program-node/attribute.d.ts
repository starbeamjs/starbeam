import type * as minimal from "@domtree/minimal";
import type { Reactive, ReactiveMetadata } from "@starbeam/core";
import { AbstractProgramNode, RenderedProgramNode } from "../../../core/program-node/program-node.js";
import { LazyDOM } from "../dom/streaming/token.js";
import { ElementHeadConstructor } from "../dom/streaming/tree-constructor.js";
import type { BuildAttribute } from "./element.js";
export declare class AttributeProgramNode extends AbstractProgramNode<ElementHeadConstructor, minimal.ParentNode> {
    #private;
    static create(attribute: BuildAttribute): AttributeProgramNode;
    private constructor();
    get metadata(): ReactiveMetadata;
    render(buffer: ElementHeadConstructor): RenderedAttribute;
}
export declare class RenderedAttribute extends RenderedProgramNode<minimal.ParentNode> {
    #private;
    static create(attribute: LazyDOM<minimal.Attr>, value: Reactive<string | null>): RenderedAttribute;
    private constructor();
    get metadata(): ReactiveMetadata;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
}
//# sourceMappingURL=attribute.d.ts.map