import type { minimal } from "@domtree/flavors";
import type { RenderedContent } from "../program-node/interfaces/rendered-content";
import type { ReactiveMetadata } from "../reactive/metadata";

export class RenderedRoot {
  static create({
    content,
    into,
  }: {
    content: RenderedContent;
    into: minimal.ParentNode;
  }) {
    return new RenderedRoot(content, into);
  }

  readonly #content: RenderedContent;
  readonly #parent: minimal.ParentNode;

  private constructor(content: RenderedContent, parent: minimal.ParentNode) {
    this.#content = content;
    this.#parent = parent;
  }

  get metadata(): ReactiveMetadata {
    return this.#content.metadata;
  }

  /**
   * Eagerly exchange all tokens for their DOM representations. This is
   * primarily useful if you want to look at the DOM without markers.
   */
  initialize(): void {
    this.#content.initialize(this.#parent);
  }

  poll(): void {
    this.#content.poll(this.#parent);
  }
}
