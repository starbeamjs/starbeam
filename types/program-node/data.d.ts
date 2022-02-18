import type * as minimal from "@domtree/minimal";
import type { ContentBuffer } from "../dom/buffer/body.js";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { Dehydrated, LazyDOM } from "../dom/streaming/token.js";
import { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import type { ReactiveMetadata } from "../core/metadata.js";
import { ContentProgramNode } from "./interfaces/program-node.js";
import { RenderedContent } from "./interfaces/rendered-content.js";
import type { Reactive } from "../fundamental/types.js";
export declare abstract class CharacterDataProgramNode extends ContentProgramNode {
    #private;
    static text(reactive: Reactive<string>): TextProgramNode;
    static comment(reactive: Reactive<string>): CommentProgramNode;
    protected constructor(reactive: Reactive<string>);
    get metadata(): ReactiveMetadata;
    render(buffer: ContentConstructor<ContentBuffer>): RenderedCharacterData;
    abstract append(buffer: ContentConstructor<ContentBuffer>, data: string): Dehydrated<minimal.CharacterData>;
}
export declare class TextProgramNode extends CharacterDataProgramNode {
    static of(reactive: Reactive<string>): TextProgramNode;
    append(buffer: ContentConstructor, data: string): Dehydrated<minimal.Text>;
}
export declare class CommentProgramNode extends CharacterDataProgramNode {
    static of(reactive: Reactive<string>): CommentProgramNode;
    append(buffer: ContentConstructor, data: string): Dehydrated<minimal.Comment>;
}
export declare class RenderedCharacterData extends RenderedContent {
    #private;
    static create(reactive: Reactive<string>, node: LazyDOM<minimal.CharacterData>): RenderedCharacterData;
    protected constructor(reactive: Reactive<string>, node: LazyDOM<minimal.CharacterData>);
    get metadata(): ReactiveMetadata;
    initialize(inside: minimal.ParentNode): void;
    poll(inside: minimal.ParentNode): void;
    [RANGE_SNAPSHOT](inside: minimal.ParentNode): RangeSnapshot;
}
