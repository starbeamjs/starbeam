import type { ContentConstructor } from "../dom/streaming/tree-constructor";
import type { Reactive } from "../reactive/core";
import { PROGRAM_NODE_BRAND } from "../reactive/internal";
import { isObject } from "../utils";
import type { AttributeProgramNode, RenderedAttribute } from "./attribute";
import type { Dehydrated } from "./hydrator/hydrate-node";

export interface BuildMetadata {
  readonly isStatic: boolean;
}

export const STATIC_BUILD_METADATA = {
  isStatic: true,
};

export const DYNAMIC_BUILD_METADATA = {
  isStatic: false,
};

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export type RenderedProgramNode = RenderedContent | RenderedAttribute;

export interface AbstractContentProgramNode<N extends RenderedContent> {
  readonly metadata: BuildMetadata;

  /**
   * This function returns `null` if the rendered HTML is constant, and
   * therefore does not need to be updated.
   */
  render(buffer: ContentConstructor): Dehydrated<N> | null;
}

export type ProgramNode<N extends RenderedProgramNode = RenderedProgramNode> =
  N extends RenderedAttribute
    ? AttributeProgramNode
    : N extends RenderedContent
    ? AbstractContentProgramNode<N>
    : never;

export type ContentProgramNode<N extends RenderedContent = RenderedContent> =
  AbstractContentProgramNode<N>;

export interface HasStaticMetadata {
  metadata: {
    isStatic: true;
  };
}

export interface HasDynamicMetadata {
  metadata: {
    isStatic: false;
  };
}

export type StaticProgramNode = ProgramNode & HasStaticMetadata;
export type DynamicProgramNode = ProgramNode & HasStaticMetadata;

export const ProgramNode = {
  is(value: unknown): value is ProgramNode {
    return isObject(value) && PROGRAM_NODE_BRAND.is(value);
  },

  isStatic(this: void, node: ProgramNode): node is StaticProgramNode {
    return node.metadata.isStatic;
  },

  isDynamic(this: void, node: ProgramNode): node is DynamicProgramNode {
    return !ProgramNode.isStatic(node);
  },
} as const;

export interface RenderedProgramNodeMetadata {
  readonly isConstant: boolean;
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

// export interface RenderedCursor {
//   readonly after: ContentCursor;
//   readonly before: ContentCursor;
// }

// export class RenderedNodeCursor {
//   static for(
//     element: minimal.Element,
//     node: minimal.ChildNode
//   ): RenderedNodeCursor {
//     return new RenderedNodeCursor(element, node);
//   }

//   readonly #parent: minimal.Element;
//   readonly #node: minimal.ChildNode;

//   private constructor(parent: minimal.Element, node: minimal.ChildNode) {
//     this.#parent = parent;
//     this.#node = node;
//   }

//   get after(): ContentCursor {
//     return ContentCursor(this.#parent, this.#node.nextSibling);
//   }
// }

// export interface RenderedCursor {
//   readonly after: ContentCursor;
//   readonly before: ContentCursor;
// }

export interface RenderedContent {
  readonly metadata: RenderedContentMetadata;

  poll(): void;
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
