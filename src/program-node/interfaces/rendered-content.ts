import type { minimal } from "@domtree/flavors";
import type { RenderedProgramNodeMetadata } from "./program-node";

export interface RenderedContent {
  readonly metadata: RenderedContentMetadata;

  poll(inside: minimal.ParentNode): void;
}

export interface RenderedContentMetadata extends RenderedProgramNodeMetadata {
  readonly isStable: {
    readonly firstNode: boolean;
    readonly lastNode: boolean;
  };
}

export const UPDATING_METADATA = {
  isConstant: false,
  isStable: {
    firstNode: false,
    lastNode: false,
  },
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
export type UpdatingRenderedContent = RenderedContent & HasUpdatingMetadata;

export const RenderedContent = {
  isConstant(
    this: void,
    rendered: RenderedContent
  ): rendered is ConstantRenderedContent {
    return rendered.metadata.isConstant;
  },

  isUpdating(
    this: void,
    rendered: RenderedContent
  ): rendered is UpdatingRenderedContent {
    return !RenderedContent.isConstant(rendered);
  },
} as const;
