import type { minimal } from "@domtree/flavors";
import type {
  RenderedContent,
  RenderedContentMetadata,
} from "../program-node/interfaces/rendered-content";

export class RenderedRoot {
  static create({
    content,
    into,
  }: {
    content: RenderedContent;
    into: minimal.ParentNode;
  }) {
    return new RenderedRoot(content, into, content.metadata);
  }

  readonly #content: RenderedContent;
  readonly #parent: minimal.ParentNode;

  private constructor(
    content: RenderedContent,
    parent: minimal.ParentNode,
    readonly metadata: RenderedContentMetadata
  ) {
    this.#content = content;
    this.#parent = parent;
  }

  /**
   * Eagerly exchange all tokens for their DOM representations. This is
   * primarily useful if you want to look at the DOM without markers.
   */
  eager(): void {
    this.#content.poll(this.#parent);
  }

  poll(): void {
    this.#content.poll(this.#parent);
  }
}
