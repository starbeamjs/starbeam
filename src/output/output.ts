import type { DomImplementation } from "../dom/implementation";
import type { DomType, DomTypes } from "../dom/types";
import type { ChildNodeCursor } from "../index";
import type { Reactive } from "../reactive/core";
import { OUTPUT_BRAND } from "../reactive/internal";
import { isObject } from "../utils";

export interface BuildMetadata {
  readonly isStatic: boolean;
}

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export interface Output<T extends DomTypes, N extends T[keyof T]> {
  readonly metadata: BuildMetadata;

  render(dom: DomImplementation<T>, cursor: ChildNodeCursor<T>): Rendered<T, N>;
}

export type StaticOutput<T extends DomTypes, N extends DomType<T>> = Output<
  T,
  N
> & {
  metadata: {
    isStatic: true;
  };
};
export type DynamicOutput<T extends DomTypes, N extends DomType<T>> = Output<
  T,
  N
> & {
  metadata: {
    isStatic: false;
  };
};

export const Output = {
  is<T extends DomTypes>(value: unknown): value is AnyOutput<T> {
    return isObject(value) && OUTPUT_BRAND.is(value);
  },

  isStatic<T extends DomTypes, N extends DomType<T>>(
    this: void,
    output: Output<T, N>
  ): output is StaticOutput<T, N> {
    return output.metadata.isStatic;
  },

  isDynamic<T extends DomTypes, N extends DomType<T>>(
    this: void,
    output: Output<T, N>
  ): output is DynamicOutput<T, N> {
    return !Output.isStatic(output);
  },
} as const;

export type AnyOutput<T extends DomTypes> = Output<T, DomType<T>>;

export interface RenderMetadata {
  isConstant: boolean;
  isStable: {
    firstNode: boolean;
    lastNode: boolean;
  };
}

export interface Rendered<T extends DomTypes, N extends T[keyof T]> {
  readonly metadata: RenderMetadata;
  readonly node: N;

  poll(dom: DomImplementation<T>): void;
}

export type AnyRendered<T extends DomTypes> = Rendered<T, DomType<T>>;

export type ConstantRendered<
  T extends DomTypes,
  N extends DomType<T>
> = Rendered<T, N> & {
  metadata: {
    isStatic: true;
  };
};
export type DynamicRendered<
  T extends DomTypes,
  N extends DomType<T>
> = Rendered<T, N> & {
  metadata: {
    isStatic: false;
  };
};

export const Rendered = {
  isConstant<T extends DomTypes, N extends DomType<T>>(
    this: void,
    rendered: Rendered<T, N>
  ): rendered is ConstantRendered<T, N> {
    return rendered.metadata.isConstant;
  },

  isDynamic<T extends DomTypes, N extends DomType<T>>(
    this: void,
    rendered: Rendered<T, N>
  ): rendered is DynamicRendered<T, N> {
    return !Rendered.isConstant(rendered);
  },
} as const;
