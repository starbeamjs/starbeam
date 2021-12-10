import { Reactive } from "./core";

export type Choice<T> = {
  discriminant: string;
  value?: Reactive<T>;
};

export type AnyChoice = Choice<unknown>;

export type Type<T> = (value: unknown) => value is T;
export type Variant<T> = [discriminant: string, value?: Type<T>];

export type TypeFor<T extends Type<unknown> | undefined> = T extends undefined
  ? undefined
  : T extends Type<infer V>
  ? V
  : never;

type ValueFor<C extends AnyChoice, K extends C["discriminant"]> = C extends {
  discriminant: K;
  value: infer V;
}
  ? V
  : never;

interface ReactiveChoiceConstructor<C extends AnyChoice> {
  <K extends C["discriminant"]>(discriminant: K): C;
  <K extends C["discriminant"]>(discriminant: K, value: ValueFor<C, K>): C;
}

export class ReactiveChoices<C extends AnyChoice> {
  static define<C extends AnyChoice>(
    def: (choices: ReactiveChoices<never>) => ReactiveChoices<C>
  ): ReactiveChoiceConstructor<C> {
    return def(new ReactiveChoices()).done();
  }

  add<K extends string>(
    discriminant: K
  ): ReactiveChoices<C | { discriminant: K }>;
  add<K extends string, T>(
    discriminant: K,
    value: Type<T>
  ): ReactiveChoices<C | { discriminant: K; value: Reactive<T> }>;
  add(
    _discriminant: string,
    _value?: Type<unknown>
  ): ReactiveChoices<AnyChoice> {
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
      value?: any
    ): { discriminant: string; value?: any } {
      return {
        discriminant,
        value,
      };
    }

    return create;
  }
}
