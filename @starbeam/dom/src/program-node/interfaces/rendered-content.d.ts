import type { minimal } from "@domtree/flavors";
import { ConstantMetadata, DynamicMetadata, HasMetadata, ReactiveMetadata } from "@starbeam/core";
import { ContentCursor, RangeSnapshot, RANGE_SNAPSHOT } from "../../dom/streaming/cursor.js";
import type { RenderedAttribute } from "../attribute.js";
export declare abstract class RenderedContent extends HasMetadata {
    static isConstant(this: void, rendered: RenderedContent): rendered is ConstantRenderedContent;
    static isUpdating(this: void, rendered: RenderedContent): rendered is UpdatingRenderedContent;
    /**
     * This should be computed fresh for each call. Consumers should never hang on
     * to the returned object as its contents can (and do) change frequently.
     */
    abstract [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot;
    abstract poll(inside: minimal.ParentNode): void;
    abstract initialize(inside: minimal.ParentNode): void;
    abstract get metadata(): ReactiveMetadata;
    remove(inside: minimal.ParentNode): ContentCursor;
    move(to: ContentCursor): void;
}
export interface HasConstantMetadata {
    metadata: ConstantMetadata;
}
export interface HasUpdatingMetadata {
    metadata: DynamicMetadata;
}
export declare type ConstantRenderedContent = RenderedContent & HasConstantMetadata;
export declare type ConstantRenderedAttribute = RenderedAttribute & HasConstantMetadata;
export declare type UpdatingRenderedContent = RenderedContent & HasUpdatingMetadata;
export declare type UpdatingRenderedAttribute = RenderedAttribute & HasUpdatingMetadata;
//# sourceMappingURL=rendered-content.d.ts.map