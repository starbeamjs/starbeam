import type { minimal } from "@domtree/flavors";
import { ReactiveMetadata } from "../../reactive/metadata.js";
import { NonemptyList } from "../../utils.js";
import { RenderedContent } from "../interfaces/rendered-content.js";
import type { ContentsIndex } from "./loop.js";
export declare class RenderSnapshot {
    #private;
    readonly metadata: ReactiveMetadata;
    readonly contents: ContentsIndex;
    static from(list: readonly KeyedContent[]): RenderSnapshot;
    static of(list: NonemptyList<KeyedContent> | null): RenderSnapshot;
    private constructor();
    isEmpty(): boolean;
    adding(...content: readonly KeyedContent[]): RenderSnapshot;
    get boundaries(): [first: KeyedContent, last: KeyedContent] | null;
    getPresent(keys: readonly unknown[]): readonly KeyedContent[];
    get keys(): readonly unknown[];
    get(key: unknown): KeyedContent | null;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
}
export declare class KeyedContent {
    readonly key: unknown;
    readonly content: RenderedContent;
    static create(key: unknown, content: RenderedContent): KeyedContent;
    private constructor();
}
