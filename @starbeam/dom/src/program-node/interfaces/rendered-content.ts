import type { minimal } from "@domtree/flavors";
import { Reactive } from "@starbeam/reactive";
import type {
  REACTIVE,
  ReactiveInternals,
  ReactiveProtocol,
} from "@starbeam/timeline";
import {
  ContentCursor,
  RangeSnapshot,
  RANGE_SNAPSHOT,
} from "../../dom/streaming/cursor.js";

export abstract class RenderedContent implements ReactiveProtocol {
  static isConstant(this: void, rendered: RenderedContent): boolean {
    return Reactive.getDependencies(rendered).matches("Constant");
  }

  static isUpdating(this: void, rendered: RenderedContent): boolean {
    return !RenderedContent.isConstant(rendered);
  }

  abstract [REACTIVE]: ReactiveInternals;

  /**
   * This should be computed fresh for each call. Consumers should never hang on
   * to the returned object as its contents can (and do) change frequently.
   */
  abstract [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot;
  abstract poll(inside: minimal.ParentNode): void;
  abstract initialize(inside: minimal.ParentNode): void;

  remove(inside: minimal.ParentNode): ContentCursor {
    let range = this[RANGE_SNAPSHOT](inside);
    return range.remove();
  }

  move(to: ContentCursor): void {
    let range = this[RANGE_SNAPSHOT](to.parent);
    range.move(to);
  }
}
