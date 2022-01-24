import type { UnsafeAny } from "../strippable/wrapper";
import type { Reactive } from "./core";
import { HasMetadata, ReactiveMetadata } from "./metadata";

export class ReactiveChoice<T, K extends string = string> extends HasMetadata {
  static create<T, K extends string>(
    disciminant: K,
    value?: Reactive<T>
  ): ReactiveChoice<T> {
    return new ReactiveChoice(disciminant, value);
  }

  private constructor(
    readonly discriminant: K,
    readonly value: Reactive<T> | undefined
  ) {
    super();
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
    def: (choices: ReactiveCases<never>) => ReactiveCases<C>
  ): ReactiveChoiceConstructor<C> {
    return def(new ReactiveCases()).done();
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

  done(): ReactiveChoiceConstructor<C> {
    function create<K extends C["discriminant"]>(discriminant: K): C;
    function create<K extends C["discriminant"]>(
      discriminant: K,
      value: ValueFor<C, K>
    ): C;
    function create(
      discriminant: string,
      value?: UnsafeAny
    ): { discriminant: string; value?: UnsafeAny } {
      return {
        discriminant,
        value,
      };
    }

    return create;
  }
}
