import type { minimal } from "@domtree/flavors";
import { AbstractProgramNode } from "@starbeam/core";
import {
  REACTIVE,
  ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import type { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import type { RenderedContent } from "./interfaces/rendered-content.js";

export class Rendered<R extends RenderedContent> implements ReactiveProtocol {
  static of<R extends RenderedContent>(content: R): Rendered<R> {
    return new Rendered(content);
  }

  private constructor(readonly content: R) {}

  get [REACTIVE](): ReactiveInternals {
    return ReactiveInternals.get(this.content);
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
