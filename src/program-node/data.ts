import type * as minimal from "@domtree/minimal";
import type { ContentBuffer } from "../dom/buffer/body";
import { Dehydrated, LazyDOM } from "../dom/streaming/token";
import { ContentConstructor, TOKEN } from "../dom/streaming/tree-constructor";
import { Reactive } from "../reactive/core";
import { mutable } from "../strippable/minimal";
import type {
  AbstractContentProgramNode,
  BuildMetadata,
} from "./interfaces/program-node";
import type {
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

  render(
    buffer: ContentConstructor<ContentBuffer>
  ): RenderedCharacterData | null {
    let token = this.append(buffer, this.#reactive.current);
    return RenderedCharacterData.create(this.#reactive, LazyDOM.create(token));
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

  readonly append = (buffer: ContentConstructor, data: string) =>
    buffer.text(data, TOKEN);
}

export class CommentProgramNode extends CharacterDataProgramNode {
  static of(reactive: Reactive<string>): CommentProgramNode {
    return new CommentProgramNode(reactive, {
      isStatic: Reactive.isStatic(reactive),
    });
  }

  readonly append = (buffer: ContentConstructor, data: string) =>
    buffer.comment(data, TOKEN);
}

class RenderedCharacterData implements RenderedContent {
  static create(
    reactive: Reactive<string>,
    node: LazyDOM<minimal.CharacterData>
  ) {
    return new RenderedCharacterData(reactive, node, {
      isConstant: Reactive.isStatic(reactive),
      isStable: {
        firstNode: true,
        lastNode: true,
      },
    });
  }

  #reactive: Reactive<string>;
  #node: LazyDOM<minimal.CharacterData>;

  protected constructor(
    reactive: Reactive<string>,
    node: LazyDOM<minimal.CharacterData>,
    readonly metadata: RenderedContentMetadata
  ) {
    this.#reactive = reactive;
    this.#node = node;
  }

  poll(inside: minimal.Element): void {
    mutable(this.#node.get(inside)).data = this.#reactive.current;
  }
}
