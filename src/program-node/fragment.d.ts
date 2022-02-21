import type { ParentNode } from "@domtree/minimal";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import { ReactiveMetadata } from "../core/metadata.js";
import { NonemptyList } from "../utils.js";
import { ContentProgramNode } from "./interfaces/program-node.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
export declare class FragmentProgramNode extends ContentProgramNode {
    #private;
    static of(children: NonemptyList<ContentProgramNode>): FragmentProgramNode;
    constructor(children: NonemptyList<ContentProgramNode>);
    get metadata(): ReactiveMetadata;
    render(buffer: ContentConstructor): RenderedFragmentNode;
}
export declare class RenderedFragmentNode extends RenderedContent {
    #private;
    static create(children: readonly RenderedContent[]): RenderedFragmentNode;
    private constructor();
    get metadata(): ReactiveMetadata;
    [RANGE_SNAPSHOT](inside: ParentNode): RangeSnapshot;
    poll(inside: ParentNode): void;
    initialize(inside: ParentNode): void;
}
export declare class FragmentProgramNodeBuilder {
    #private;
    static build(build: (builder: FragmentProgramNodeBuilder) => void): FragmentProgramNode;
    append(output: ContentProgramNode): this;
    finalize(): FragmentProgramNode;
}
//# sourceMappingURL=fragment.d.ts.map