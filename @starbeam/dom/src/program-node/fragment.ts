import type { ParentNode } from "@domtree/minimal";
import { has, NonemptyList, ReactiveMetadata } from "@starbeam/core";
import { verify } from "@starbeam/verify";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import { ContentProgramNode } from "./content.js";
import { RenderedContent } from "./interfaces/rendered-content.js";

export class FragmentProgramNode extends ContentProgramNode {
  static of(children: NonemptyList<ContentProgramNode>): FragmentProgramNode {
    return new FragmentProgramNode(children);
  }

  readonly #children: NonemptyList<ContentProgramNode>;

  constructor(children: NonemptyList<ContentProgramNode>) {
    super();
    this.#children = children;
  }

  get metadata(): ReactiveMetadata {
    return ReactiveMetadata.all(...this.#children);
  }

  render(buffer: ContentConstructor): RenderedFragmentNode {
    let children = this.#children
      .asArray()
      .map((child) => child.render(buffer));

    return RenderedFragmentNode.create(children);
  }
}

export class RenderedFragmentNode extends RenderedContent {
  static create(children: readonly RenderedContent[]): RenderedFragmentNode {
    return new RenderedFragmentNode(children);
  }

  #content: readonly RenderedContent[];

  private constructor(content: readonly RenderedContent[]) {
    super();
    this.#content = content;
  }

  get metadata(): ReactiveMetadata {
    return ReactiveMetadata.all(...this.#content);
  }

  [RANGE_SNAPSHOT](inside: ParentNode): RangeSnapshot {
    verify(this.#content, has.items);

    let first = this.#content[0];
    let last = this.#content[this.#content.length - 1];
    return first[RANGE_SNAPSHOT](inside).join(last[RANGE_SNAPSHOT](inside));
  }

  poll(inside: ParentNode): void {
    for (let content of this.#content) {
      content.poll(inside);
    }
  }

  initialize(inside: ParentNode): void {
    for (let content of this.#content) {
      content.initialize(inside);
    }
  }
}

export class FragmentProgramNodeBuilder {
  static build(
    build: (builder: FragmentProgramNodeBuilder) => void
  ): FragmentProgramNode {
    let builder = new FragmentProgramNodeBuilder();
    build(builder);
    return builder.finalize();
  }

  readonly #children: ContentProgramNode[] = [];

  append(output: ContentProgramNode): this {
    this.#children.push(output);
    return this;
  }

  finalize(): FragmentProgramNode {
    return FragmentProgramNode.of(NonemptyList.verified(this.#children));
  }
}
