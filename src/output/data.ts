import type * as minimal from "@domtree/minimal";
import { UpdatingContentCursor } from "../dom/cursor/updating";
import {
  CommentOperation,
  ContentOperation,
  TextOperation,
  TOKEN,
  TreeConstructor,
} from "../dom/streaming/tree-constructor";
import type { Reactive } from "../reactive/core";
import { verified } from "../strippable/assert";
import { is, mutable } from "../strippable/minimal";
import {
  AbstractProgramNode,
  BuildMetadata,
  Dehydrated,
  Rendered,
  RenderMetadata,
} from "./program-node";

type DataNode = minimal.Text | minimal.Comment;

export type TextProgramNode = DataProgramNode<minimal.Text>;
export type CommentProgramNode = DataProgramNode<minimal.Comment>;

export class DataProgramNode<N extends DataNode>
  implements AbstractProgramNode<N>
{
  static text(reactive: Reactive<string>): TextProgramNode {
    return new DataProgramNode(reactive, TextOperation.of);
  }

  static comment(reactive: Reactive<string>): CommentProgramNode {
    return new DataProgramNode(reactive, CommentOperation.of);
  }

  readonly #reactive: Reactive<string>;
  readonly #create: CreateDataNode;

  constructor(reactive: Reactive<string>, node: CreateDataNode) {
    this.#reactive = reactive;
    this.#create = node;
  }

  get metadata(): BuildMetadata {
    return {
      isStatic: this.#reactive.metadata.isStatic,
    };
  }

  render(tree: TreeConstructor): Dehydrated<N> {
    let token = tree.add(this.#create(this.#reactive.current), TOKEN);
    return Dehydrated.create<N>(
      token,
      (node) =>
        new RenderedDataNode(
          this.#reactive,
          verified(node.parentNode, is.Element),
          node
        )
    );
  }
}

interface CreateDataNode {
  (data: string): ContentOperation;
}

export class RenderedDataNode<N extends DataNode> implements Rendered {
  readonly #reactive: Reactive<string>;
  readonly #parent: minimal.Element;
  readonly #node: N;

  constructor(reactive: Reactive<string>, parent: minimal.Element, node: N) {
    this.#reactive = reactive;
    this.#parent = parent;
    this.#node = node;
  }

  get cursor(): {
    readonly after: UpdatingContentCursor;
    readonly before: UpdatingContentCursor;
  } {
    return {
      after: UpdatingContentCursor.create(this.#parent, this.#node.nextSibling),
      before: UpdatingContentCursor.create(
        this.#parent,
        this.#node.previousSibling
      ),
    };
  }

  get metadata(): RenderMetadata {
    return {
      isConstant: this.#reactive.metadata.isStatic,
      isStable: {
        firstNode: true,
        lastNode: true,
      },
    };
  }

  get node(): N {
    return this.#node;
  }

  poll(): void {
    mutable(this.#node).data = this.#reactive.current;
  }
}
