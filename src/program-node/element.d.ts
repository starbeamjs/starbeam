import type * as minimal from "@domtree/minimal";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { LazyDOM } from "../dom/streaming/token.js";
import { TreeConstructor } from "../dom/streaming/tree-constructor.js";
import { ReactiveMetadata } from "../core/metadata.js";
import { RenderedAttribute } from "./attribute.js";
import { RenderedFragmentNode } from "./fragment.js";
import { ContentProgramNode } from "./interfaces/program-node.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
import { Reactive } from "../reactive/reactive.js";
export declare class ElementProgramNode extends ContentProgramNode {
    #private;
    static create(tagName: Reactive<string>, buildAttributes: readonly BuildAttribute[], content: readonly ContentProgramNode[]): ElementProgramNode;
    private constructor();
    get metadata(): ReactiveMetadata;
    render(buffer: TreeConstructor): RenderedElementNode;
}
export interface FinalizedElement {
    readonly attributes: readonly RenderedAttribute[];
    readonly content: RenderedFragmentNode | null;
}
export declare class RenderedElementNode extends RenderedContent {
    #private;
    static create(node: LazyDOM<minimal.Element>, tagName: Reactive<string>, attributes: readonly RenderedAttribute[], children: RenderedFragmentNode | null): RenderedElementNode;
    private constructor();
    get metadata(): ReactiveMetadata;
    [RANGE_SNAPSHOT](inside: minimal.ParentNode): RangeSnapshot;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
}
export declare type AbstractAttributeName<Prefix extends string | undefined, LocalName extends string> = Prefix extends undefined ? LocalName : `${Prefix}:${LocalName}`;
export declare type AttributeName<Prefix extends string | undefined = string | undefined, LocalName extends string = string> = AbstractAttributeName<Prefix, LocalName>;
export interface BuildAttribute {
    name: AttributeName;
    value: Reactive<string | null>;
}
export declare type ReactiveElementBuilderCallback = (builder: ElementProgramNodeBuilder) => void;
export declare class ElementProgramNodeBuilder {
    #private;
    static build(tagName: Reactive<string>, build: (builder: ElementProgramNodeBuilder) => void): ElementProgramNode;
    constructor(tagName: Reactive<string>);
    append(output: string | ContentProgramNode): this;
    attribute(attribute: BuildAttribute): this;
    finalize(): ElementProgramNode;
}
