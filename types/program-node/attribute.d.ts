import type * as minimal from "@domtree/minimal";
import { LazyDOM } from "../dom/streaming/token.js";
import { ElementHeadConstructor } from "../dom/streaming/tree-constructor.js";
import type { AbstractReactive } from "../reactive/core.js";
import type { ReactiveMetadata } from "../reactive/metadata.js";
import type { BuildAttribute } from "./element.js";
import { AbstractProgramNode, RenderedProgramNode } from "./interfaces/program-node.js";
export declare class AttributeProgramNode extends AbstractProgramNode<ElementHeadConstructor, minimal.ParentNode> {
    #private;
    static create(attribute: BuildAttribute): AttributeProgramNode;
    private constructor();
    get metadata(): ReactiveMetadata;
    render(buffer: ElementHeadConstructor): RenderedAttribute;
}
export declare class RenderedAttribute extends RenderedProgramNode<minimal.ParentNode> {
    #private;
    static create(attribute: LazyDOM<minimal.Attr>, value: AbstractReactive<string | null>): RenderedAttribute;
    private constructor();
    get metadata(): ReactiveMetadata;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
}
