import type { minimal } from "@domtree/flavors";
import type { ContentConstructor } from "../../dom/streaming/tree-constructor.js";
import type { ExtendsReactive } from "../../reactive/base.js";
import { HasMetadata, ReactiveMetadata } from "../../core/metadata.js";
import type { RenderedContent } from "./rendered-content.js";
export declare type OutputBuilder<In, Out> = (input: ExtendsReactive<In>) => Out;
export declare abstract class RenderedProgramNode<Container> extends HasMetadata {
    abstract initialize(inside: Container): void;
    abstract poll(inside: Container): void;
}
export declare abstract class AbstractProgramNode<Cursor, Container> extends HasMetadata {
    isConstant(): boolean;
    isDynamic(): boolean;
    abstract get metadata(): ReactiveMetadata;
    abstract render(cursor: Cursor): RenderedProgramNode<Container>;
}
export declare type ProgramNode<Cursor = unknown, Container = unknown> = AbstractProgramNode<Cursor, Container>;
export declare class Rendered<R extends RenderedContent> extends HasMetadata {
    readonly content: R;
    static of<R extends RenderedContent>(content: R): Rendered<R>;
    private constructor();
    get metadata(): ReactiveMetadata;
}
export declare abstract class ContentProgramNode extends AbstractProgramNode<ContentConstructor, minimal.ParentNode> {
    /**
     * This function returns `null` if the rendered HTML is constant, and
     * therefore does not need to be updated.
     */
    abstract render(buffer: ContentConstructor): RenderedContent;
}
