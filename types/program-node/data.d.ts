import type * as minimal from "@domtree/minimal";
import type { ContentBuffer } from "../dom/buffer/body.js";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { Dehydrated, LazyDOM } from "../dom/streaming/token.js";
import { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import type { AbstractReactive } from "../reactive/core.js";
import type { ReactiveMetadata } from "../reactive/metadata.js";
import { ContentProgramNode } from "./interfaces/program-node.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
export declare abstract class CharacterDataProgramNode extends ContentProgramNode {
    #private;
    static text(reactive: AbstractReactive<string>): TextProgramNode;
    static comment(reactive: AbstractReactive<string>): CommentProgramNode;
    protected constructor(reactive: AbstractReactive<string>);
    get metadata(): ReactiveMetadata;
    render(buffer: ContentConstructor<ContentBuffer>): RenderedCharacterData;
    abstract append(buffer: ContentConstructor<ContentBuffer>, data: string): Dehydrated<minimal.CharacterData>;
}
export declare class TextProgramNode extends CharacterDataProgramNode {
    static of(reactive: AbstractReactive<string>): TextProgramNode;
    append(buffer: ContentConstructor, data: string): Dehydrated<minimal.Text>;
}
export declare class CommentProgramNode extends CharacterDataProgramNode {
    static of(reactive: AbstractReactive<string>): CommentProgramNode;
    append(buffer: ContentConstructor, data: string): Dehydrated<minimal.Comment>;
}
export declare class RenderedCharacterData extends RenderedContent {
    #private;
    static create(reactive: AbstractReactive<string>, node: LazyDOM<minimal.CharacterData>): RenderedCharacterData;
    protected constructor(reactive: AbstractReactive<string>, node: LazyDOM<minimal.CharacterData>);
    get metadata(): ReactiveMetadata;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
    [RANGE_SNAPSHOT](inside: minimal.ParentNode): RangeSnapshot;
}
