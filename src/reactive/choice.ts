import type { UnsafeAny } from "../strippable/wrapper.js";
import type { AbstractReactive } from "./core.js";
import { HasMetadata, ReactiveMetadata } from "./metadata.js";

export class ReactiveChoice<T, K extends string = string> extends HasMetadata {
  static create<T, K extends string>(
    description: string,
    disciminant: K,
    value?: AbstractReactive<T>
  ): ReactiveChoice<T> {
    return new ReactiveChoice(disciminant, value, description);
  }

  // Make ReactiveChoice a nominal class
  readonly #discriminant: K;

  private constructor(
    discriminant: K,
    readonly value: AbstractReactive<T> | undefined,
    readonly description: string
  ) {
    super();
    this.#discriminant = discriminant;
  }

  get discriminant(): K {
    return this.#discriminant;
  }

  get metadata(): ReactiveMetadata {
    return this.value === undefined
      ? ReactiveMetadata.Constant
      : this.value.metadata;
  }
}

export type AnyReactiveChoice = ReactiveChoice<unknown>;

export type Type<T> = (value: unknown) => value is T;
export type Variant<T> = [discriminant: string, value?: Type<T>];

const number = (value: unknown): value is number => {
  return typeof value === "number";
};

function MakeType<T>(): Type<T> {
  return (value: unknown): value is T => true;
}

export type TypeFor<T extends Type<unknown> | undefined> = T extends undefined
  ? undefined
  : T extends Type<infer V>
  ? V
  : never;

type ValueFor<
  C extends AnyReactiveChoice,
  K extends C["discriminant"]
> = C extends {
  discriminant: K;
  value: infer V;
}
  ? V
  : never;

interface ReactiveChoiceConstructor<C extends AnyReactiveChoice> {
  <K extends C["discriminant"]>(discriminant: K): C;
  <K extends C["discriminant"]>(discriminant: K, value: ValueFor<C, K>): C;
}

export class ReactiveCases<C extends AnyReactiveChoice> {
  static define<C extends AnyReactiveChoice>(
    description: string,
    def: (choices: ReactiveCases<never>) => ReactiveCases<C>
  ): ReactiveChoiceConstructor<C> {
    return def(new ReactiveCases()).done(description);
  }

  add<K extends string>(
    discriminant: K
  ): ReactiveCases<C | ReactiveChoice<void, K>>;
  add<K extends string, T>(
    discriminant: K,
    value: Type<T>
  ): ReactiveCases<C | ReactiveChoice<T, K>>;
  add(
    _discriminant: string,
    _value?: Type<unknown>
  ): ReactiveCases<AnyReactiveChoice> {
    return this;
  }

  done(description: string): ReactiveChoiceConstructor<C> {
    function create<K extends C["discriminant"]>(discriminant: K): C;
    function create<K extends C["discriminant"]>(
      discriminant: K,
      value: ValueFor<C, K>
    ): C;
    function create(discriminant: string, value?: UnsafeAny): C {
      return ReactiveChoice.create(description, discriminant, value) as C;
    }

    return create;
  }
}
