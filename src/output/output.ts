import type { DomImplementation } from "../dom/implementation";
import type { DomTypes } from "../dom/types";
import type { ChildNodeCursor } from "../index";
import type { Reactive } from "../reactive/core";
import { OUTPUT_BRAND } from "../reactive/internal";
import { isObject } from "../utils";

export interface BuildMetadata {
  readonly isStatic: boolean;
}

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export interface Output<T extends DomTypes> {
  readonly metadata: BuildMetadata;
  readonly NODE: T[keyof T];

  render(dom: DomImplementation<T>, cursor: ChildNodeCursor<T>): Rendered<T>;
}

export type StaticOutput<T extends DomTypes> = Output<T> & {
  metadata: {
    isStatic: true;
  };
};

export type DynamicOutput<T extends DomTypes> = Output<T> & {
  metadata: {
    isStatic: false;
  };
};

export const Output = {
  is<T extends DomTypes>(value: unknown): value is Output<T> {
    return isObject(value) && OUTPUT_BRAND.is(value);
  },

  isStatic<T extends DomTypes>(
    this: void,
    output: Output<T>
  ): output is StaticOutput<T> {
    return output.metadata.isStatic;
  },

  isDynamic<T extends DomTypes>(
    this: void,
    output: Output<T>
  ): output is DynamicOutput<T> {
    return !Output.isStatic(output);
  },
} as const;

export interface RenderMetadata {
  isConstant: boolean;
  isStable: {
    firstNode: boolean;
    lastNode: boolean;
  };
}

export interface Rendered<T extends DomTypes> {
  readonly metadata: RenderMetadata;
  readonly NODE: T[keyof T];

  poll(dom: DomImplementation<T>): void;
  move(dom: DomImplementation<T>, cursor: ChildNodeCursor<T>): void;
}

export type AnyRendered<T extends DomTypes> = Rendered<T>;

export type ConstantRendered<T extends DomTypes> = Rendered<T> & {
  metadata: {
    isStatic: true;
  };
};
export type DynamicRendered<T extends DomTypes> = Rendered<T> & {
  metadata: {
    isStatic: false;
  };
};

export const Rendered = {
  isConstant<T extends DomTypes>(
    this: void,
    rendered: Rendered<T>
  ): rendered is ConstantRendered<T> {
    return rendered.metadata.isConstant;
  },

  isDynamic<T extends DomTypes>(
    this: void,
    rendered: Rendered<T>
  ): rendered is DynamicRendered<T> {
    return !Rendered.isConstant(rendered);
  },
} as const;
