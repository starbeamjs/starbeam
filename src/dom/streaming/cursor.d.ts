import type { minimal } from "@domtree/flavors";
import type { RenderedContent } from "../../program-node/interfaces/rendered-content.js";
import type { DomEnvironment } from "../environment.js";
export declare class ContentCursor {
    readonly parent: minimal.ParentNode;
    readonly next: minimal.ChildNode | null;
    static create(parent: minimal.ParentNode, next: minimal.ChildNode | null): ContentCursor;
    static verified(parent: minimal.ParentNode | null, next: minimal.ChildNode | null): ContentCursor;
    protected constructor(parent: minimal.ParentNode, next: minimal.ChildNode | null);
    mutate(utils: DomEnvironment): MutateContentCursor;
}
export declare class MutateContentCursor extends ContentCursor {
    #private;
    readonly environment: DomEnvironment;
    static mutate(environment: DomEnvironment, parent: minimal.ParentNode, next: minimal.ChildNode | null): MutateContentCursor;
    private constructor();
    insertHTML(html: string): void;
    insert(node: minimal.ChildNode | minimal.DocumentFragment): void;
}
/**
 * A snapshot of the range for rendered content. This must be used immediately
 * and cannot be saved off.
 */
export declare class RangeSnapshot {
    #private;
    readonly environment: DomEnvironment;
    readonly parent: minimal.ParentNode;
    readonly first: minimal.ChildNode;
    readonly last: minimal.ChildNode;
    static create(environment: DomEnvironment, first: minimal.ChildNode, last?: minimal.ChildNode): RangeSnapshot;
    static forContent(inside: minimal.ParentNode, start: RenderedContent, end?: RenderedContent): RangeSnapshot;
    private constructor();
    get before(): ContentCursor;
    get after(): ContentCursor;
    join(other: RangeSnapshot): RangeSnapshot;
    remove(): ContentCursor;
    move(to: ContentCursor): void;
}
export declare const RANGE_SNAPSHOT = "RANGE_SNAPSHOT";
//# sourceMappingURL=cursor.d.ts.map