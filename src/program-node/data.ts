import type * as minimal from "@domtree/minimal";
import type { ContentBuffer } from "../dom/buffer/body";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor";
import type { Dehydrated, LazyDOM } from "../dom/streaming/token";
import { ContentConstructor, TOKEN } from "../dom/streaming/tree-constructor";
import { Reactive } from "../reactive/core";
import { mutable } from "../strippable/minimal";
import type {
  AbstractContentProgramNode,
  BuildMetadata,
} from "./interfaces/program-node";
import {
  RenderedContent,
  RenderedContentMetadata,
} from "./interfaces/rendered-content";

export abstract class CharacterDataProgramNode
  implements AbstractContentProgramNode<RenderedCharacterData>
{
  static text(reactive: Reactive<string>): TextProgramNode {
    return TextProgramNode.of(reactive);
  }

  static comment(reactive: Reactive<string>): CommentProgramNode {
    return CommentProgramNode.of(reactive);
  }

  readonly #reactive: Reactive<string>;

  protected constructor(
    reactive: Reactive<string>,
    readonly metadata: BuildMetadata
  ) {
    this.#reactive = reactive;
  }

  render(buffer: ContentConstructor<ContentBuffer>): RenderedCharacterData {
    let token = this.append(buffer, this.#reactive.current);
    return RenderedCharacterData.create(this.#reactive, token.dom);
  }

  abstract append(
    buffer: ContentConstructor<ContentBuffer>,
    data: string
  ): Dehydrated<minimal.CharacterData>;
}

export class TextProgramNode extends CharacterDataProgramNode {
  static of(reactive: Reactive<string>): TextProgramNode {
    return new TextProgramNode(reactive, {
      isStatic: Reactive.isStatic(reactive),
    });
  }

  append(buffer: ContentConstructor, data: string): Dehydrated<minimal.Text> {
    return buffer.text(data, TOKEN);
  }
}

export class CommentProgramNode extends CharacterDataProgramNode {
  static of(reactive: Reactive<string>): CommentProgramNode {
    return new CommentProgramNode(reactive, {
      isStatic: Reactive.isStatic(reactive),
    });
  }

  append(
    buffer: ContentConstructor,
    data: string
  ): Dehydrated<minimal.Comment> {
    return buffer.comment(data, TOKEN);
  }
}

class RenderedCharacterData extends RenderedContent {
  static create(
    reactive: Reactive<string>,
    node: LazyDOM<minimal.CharacterData>
  ) {
    return new RenderedCharacterData(reactive, node, {
      isConstant: Reactive.isStatic(reactive),
    });
  }

  #reactive: Reactive<string>;
  #node: LazyDOM<minimal.CharacterData>;

  protected constructor(
    reactive: Reactive<string>,
    node: LazyDOM<minimal.CharacterData>,
    readonly metadata: RenderedContentMetadata
  ) {
    super();
    this.#reactive = reactive;
    this.#node = node;
  }

  poll(inside: minimal.ParentNode): void {
    mutable(this.#node.get(inside)).data = this.#reactive.current;
  }

  [RANGE_SNAPSHOT](inside: minimal.ParentNode): RangeSnapshot {
    return RangeSnapshot.create(this.#node.get(inside));
  }
}
