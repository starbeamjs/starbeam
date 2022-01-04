import type * as minimal from "@domtree/minimal";
import type { DehydratedToken } from "../dom/streaming/token";
import { TOKEN, TreeConstructor } from "../dom/streaming/tree-constructor";
import type { Reactive } from "../reactive/core";
import { verified } from "../strippable/assert";
import { is, mutable } from "../strippable/minimal";
import { Dehydrated } from "./hydrator/hydrate-node";
import type {
  AbstractContentProgramNode,
  BuildMetadata,
  RenderedContent,
  RenderedContentMetadata,
} from "./program-node";

type DataNode = minimal.Text | minimal.Comment;

export type TextProgramNode = DataProgramNode<minimal.Text>;
export type CommentProgramNode = DataProgramNode<minimal.Comment>;

export class DataProgramNode<N extends DataNode>
  implements AbstractContentProgramNode<RenderedDataNode<N>>
{
  static text(reactive: Reactive<string>): TextProgramNode {
    return new DataProgramNode(reactive, (buffer, data) =>
      buffer.text(data, TOKEN)
    );
  }

  static comment(reactive: Reactive<string>): CommentProgramNode {
    return new DataProgramNode(reactive, (buffer, data) =>
      buffer.comment(data, TOKEN)
    );
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

  render(tree: TreeConstructor): Dehydrated<RenderedDataNode<N>> {
    return Dehydrated.node(
      this.#create(tree, this.#reactive.current),
      (node: N) =>
        RenderedDataNode.create(
          this.#reactive,
          verified(node.parentNode, is.Element),
          node
        )
    );
  }
}

interface CreateDataNode {
  (tree: TreeConstructor, data: string): DehydratedToken;
}

export class RenderedDataNode<N extends DataNode> implements RenderedContent {
  static create<N extends DataNode>(
    reactive: Reactive<string>,
    parent: minimal.Element,
    node: N
  ): RenderedDataNode<N> {
    return new RenderedDataNode(reactive, parent, node);
  }

  readonly #reactive: Reactive<string>;
  // @ts-expect-error TODO: Cursors (we may or may not need this when move is
  // added. If it's not needed, remove this parameter)
  readonly #parent: minimal.Element;
  readonly #node: N;

  constructor(reactive: Reactive<string>, parent: minimal.Element, node: N) {
    this.#reactive = reactive;
    this.#parent = parent;
    this.#node = node;
  }

  get metadata(): RenderedContentMetadata {
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
