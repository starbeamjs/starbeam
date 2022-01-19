import type { minimal } from "@domtree/flavors";
import {
  ContentCursor,
  RangeSnapshot,
  RANGE_SNAPSHOT,
} from "../../dom/streaming/cursor";
import type { RenderedAttribute } from "../attribute";
import type { RenderedProgramNodeMetadata } from "./program-node";

export abstract class RenderedContent {
  static isConstant(
    this: void,
    rendered: RenderedContent
  ): rendered is ConstantRenderedContent {
    return rendered.metadata.isConstant;
  }

  static isUpdating(
    this: void,
    rendered: RenderedContent
  ): rendered is UpdatingRenderedContent {
    return !RenderedContent.isConstant(rendered);
  }

  abstract readonly metadata: RenderedContentMetadata;

  /**
   * This should be computed fresh for each call. Consumers should never hang on
   * to the returned object as its contents can (and do) change frequently.
   */
  abstract [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot;
  abstract poll(inside: minimal.ParentNode): void;

  eager(inside: minimal.ParentNode): void {
    this.poll(inside);
  }

  remove(inside: minimal.ParentNode): ContentCursor {
    let range = this[RANGE_SNAPSHOT](inside);
    return range.remove();
  }

  move(to: ContentCursor): void {
    let range = this[RANGE_SNAPSHOT](to.parent);
    range.move(to);
  }
}

export type RenderedContentMetadata = RenderedProgramNodeMetadata;

export const UPDATING_METADATA = {
  isConstant: false,
} as const;

export interface HasConstantMetadata {
  metadata: {
    isConstant: true;
  };
}

export interface HasStableMetadata {
  metadata: {
    isStable: {
      firstNode: true;
      lastNode: true;
    };
  };
}

export interface HasUnstableMetadata {
  metadata: {
    isStable: UnstableMetadata;
  };
}

export type UnstableMetadata =
  | {
      firstNode: false;
      lastNode: true;
    }
  | {
      firstNode: true;
      lastNode: false;
    }
  | {
      firstNode: false;
      lastNode: false;
    };

export interface HasUpdatingMetadata {
  metadata: {
    isConstant: false;
  };
}

export type ConstantRenderedContent = RenderedContent & HasConstantMetadata;
export type ConstantRenderedAttribute = RenderedAttribute & HasConstantMetadata;

export type UpdatingRenderedContent = RenderedContent & HasUpdatingMetadata;
export type UpdatingRenderedAttribute = RenderedAttribute & HasUpdatingMetadata;
