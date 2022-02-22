import type { ReactiveMetadata } from "../core/metadata.js";
import type { RenderedProgramNode } from "../program-node/program-node.js";
export declare class RenderedRoot<Container> {
    #private;
    static create<Container>({ rendered, container, }: {
        rendered: RenderedProgramNode<Container>;
        container: Container;
    }): RenderedRoot<Container>;
    private constructor();
    get metadata(): ReactiveMetadata;
    /**
     * Eagerly exchange all tokens for their DOM representations. This is
     * primarily useful if you want to look at the DOM without markers.
     */
    initialize(): this;
    poll(): void;
}
//# sourceMappingURL=root.d.ts.map