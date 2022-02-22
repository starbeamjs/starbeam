import type { minimal } from "@domtree/flavors";
import {
  ConstantMetadata,
  DynamicMetadata,
  HasMetadata,
  ReactiveMetadata,
} from "@starbeam/core";
import {
  ContentCursor,
  RangeSnapshot,
  RANGE_SNAPSHOT,
} from "../../dom/streaming/cursor.js";
import type { RenderedAttribute } from "../attribute.js";

export abstract class RenderedContent extends HasMetadata {
  static isConstant(
    this: void,
    rendered: RenderedContent
  ): rendered is ConstantRenderedContent {
    return rendered.metadata === ReactiveMetadata.Constant;
  }

  static isUpdating(
    this: void,
    rendered: RenderedContent
  ): rendered is UpdatingRenderedContent {
    return !RenderedContent.isConstant(rendered);
  }

  /**
   * This should be computed fresh for each call. Consumers should never hang on
   * to the returned object as its contents can (and do) change frequently.
   */
  abstract [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot;
  abstract poll(inside: minimal.ParentNode): void;
  abstract initialize(inside: minimal.ParentNode): void;

  abstract get metadata(): ReactiveMetadata;

  remove(inside: minimal.ParentNode): ContentCursor {
    let range = this[RANGE_SNAPSHOT](inside);
    return range.remove();
  }

  move(to: ContentCursor): void {
    let range = this[RANGE_SNAPSHOT](to.parent);
    range.move(to);
  }
}

export interface HasConstantMetadata {
  metadata: ConstantMetadata;
}

export interface HasUpdatingMetadata {
  metadata: DynamicMetadata;
}

export type ConstantRenderedContent = RenderedContent & HasConstantMetadata;
export type ConstantRenderedAttribute = RenderedAttribute & HasConstantMetadata;

export type UpdatingRenderedContent = RenderedContent & HasUpdatingMetadata;
export type UpdatingRenderedAttribute = RenderedAttribute & HasUpdatingMetadata;
