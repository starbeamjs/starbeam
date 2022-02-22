import type { minimal } from "@domtree/flavors";
import {
  AbstractProgramNode,
  HasMetadata,
  ReactiveMetadata,
} from "@starbeam/core";
import type { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import type { RenderedContent } from "./interfaces/rendered-content.js";

export class Rendered<R extends RenderedContent> extends HasMetadata {
  static of<R extends RenderedContent>(content: R): Rendered<R> {
    return new Rendered(content);
  }

  private constructor(readonly content: R) {
    super();
  }

  get metadata(): ReactiveMetadata {
    return this.content.metadata;
  }
}

export abstract class ContentProgramNode extends AbstractProgramNode<
  ContentConstructor,
  minimal.ParentNode
> {
  /**
   * This function returns `null` if the rendered HTML is constant, and
   * therefore does not need to be updated.
   */
  abstract render(buffer: ContentConstructor): RenderedContent;
}
