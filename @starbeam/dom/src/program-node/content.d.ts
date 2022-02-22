import type { minimal } from "@domtree/flavors";
import { AbstractProgramNode, HasMetadata, ReactiveMetadata } from "@starbeam/core";
import type { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import type { RenderedContent } from "./interfaces/rendered-content.js";
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
//# sourceMappingURL=content.d.ts.map