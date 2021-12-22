import type * as minimal from "@domtree/minimal";
import type { Token, TreeConstructor } from "..";
import { UpdatingContentCursor } from "../dom/cursor/updating";
import type { Reactive } from "../reactive/core";
import { PROGRAM_NODE_BRAND } from "../reactive/internal";
import { isObject } from "../utils";

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

export interface AbstractProgramNode<N extends minimal.ChildNode> {
  readonly metadata: BuildMetadata;

  /**
   * This function returns `null` if the rendered HTML is constant, and
   * therefore does not need to be updated.
   */
  render(buffer: TreeConstructor): Dehydrated<N> | null;
}

export type ProgramNode<N extends minimal.ChildNode = minimal.ChildNode> =
  AbstractProgramNode<N>;

export type Hydrator<N extends minimal.ChildNode> = (node: N) => Rendered;

export class Dehydrated<N extends minimal.ChildNode> {
  static create<N extends minimal.ChildNode>(
    token: Token,
    hydrate: Hydrator<N>
  ): Dehydrated<N> {
    return new Dehydrated(token, hydrate);
  }

  readonly #hydrate: Hydrator<N>;

  private constructor(readonly token: Token, hydrate: Hydrator<N>) {
    this.#hydrate = hydrate;
  }

  hydrate(node: N): Rendered {
    return this.#hydrate(node);
  }
}

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

export type StaticProgramNode = AbstractProgramNode<minimal.ChildNode> &
  HasStaticMetadata;
export type DynamicProgramNode = AbstractProgramNode<minimal.ChildNode> &
  HasStaticMetadata;

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

export interface RenderMetadata {
  readonly isConstant: boolean;
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

export interface RenderedCursor {
  readonly after: UpdatingContentCursor;
  readonly before: UpdatingContentCursor;
}

export class RenderedNodeCursor {
  static for(
    element: minimal.Element,
    node: minimal.ChildNode
  ): RenderedNodeCursor {
    return new RenderedNodeCursor(element, node);
  }

  readonly #parent: minimal.Element;
  readonly #node: minimal.ChildNode;

  private constructor(parent: minimal.Element, node: minimal.ChildNode) {
    this.#parent = parent;
    this.#node = node;
  }

  get after(): UpdatingContentCursor {
    return UpdatingContentCursor.create(this.#parent, this.#node.nextSibling);
  }
}

export interface Rendered {
  readonly metadata: RenderMetadata;

  readonly cursor: {
    readonly after: UpdatingContentCursor;
    readonly before: UpdatingContentCursor;
  };

  poll(): void;
}

export type ConstantRendered = Rendered & HasConstantMetadata;
export type UpdatingRendered = Rendered & HasUpdatingMetadata;

export const Rendered = {
  isConstant(this: void, rendered: Rendered): rendered is ConstantRendered {
    return rendered.metadata.isConstant;
  },

  isUpdating(this: void, rendered: Rendered): rendered is UpdatingRendered {
    return !Rendered.isConstant(rendered);
  },
} as const;
