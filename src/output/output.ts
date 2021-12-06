import { DomImplementation, DomType, DomTypes } from "../dom/implementation";
import { Reactive } from "../reactive/core";

export interface BuildMetadata {
  readonly isStatic: boolean;
}

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export interface Output<T extends DomTypes, N extends T[keyof T]> {
  readonly metadata: BuildMetadata;

  render(dom: DomImplementation<T>): Rendered<T, N>;
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
