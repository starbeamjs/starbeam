import type { minimal } from "@domtree/flavors";
import type { DomEnvironment } from "../../dom/environment.js";
import { ContentCursor, RangeSnapshot } from "../../dom/streaming/cursor.js";
import type { ReactiveMetadata } from "../../core/metadata.js";
import type { CurrentLoop, KeyedProgramNode } from "./loop.js";
import { KeyedContent, RenderSnapshot } from "./snapshot.js";
export declare class ListArtifacts {
    #private;
    /**
     * @param map A map of `{ key => RenderedContent } in insertion order.
     */
    static create(input: ReactiveMetadata, snapshot: RenderSnapshot): ListArtifacts;
    readonly metadata: ReactiveMetadata;
    private constructor();
    isEmpty(): boolean;
    get boundaries(): [first: KeyedContent, last: KeyedContent] | null;
    initialize(inside: minimal.ParentNode): void;
    poll(loop: CurrentLoop, inside: minimal.ParentNode, range: RangeSnapshot): minimal.ChildNode | null | undefined;
}
interface Changes {
    readonly added?: KeyedContent;
    readonly removed?: KeyedContent;
}
export declare abstract class PatchOperation {
    static insert(keyed: KeyedProgramNode, to: InsertAt): PatchOperation;
    static move(keyed: KeyedContent, to: InsertAt): PatchOperation;
    static remove(keyed: KeyedContent): RemoveOperation;
    abstract apply(environment: DomEnvironment, inside: minimal.ParentNode): Changes;
    abstract describe(): string;
}
declare class RemoveOperation extends PatchOperation {
    readonly keyed: KeyedContent;
    static of(keyed: KeyedContent): RemoveOperation;
    private constructor();
    apply(environment: DomEnvironment, inside: minimal.ParentNode): Changes;
    describe(): string;
}
export declare abstract class InsertAt {
    static beforeContent(keyed: KeyedContent): InsertAt;
    static after(keyed: KeyedContent): InsertAt;
    static replace(range: RangeSnapshot): InsertAt;
    static insertAtCursor(cursor: ContentCursor): InsertAt;
    abstract insert<T>(at: (cursor: ContentCursor) => T, inside: minimal.ParentNode): T;
    abstract describe(): string;
}
export {};
