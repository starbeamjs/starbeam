import type { UnsafeAny } from "../index";
import { Reactive } from "./core";

export type ReactiveChoice<T> = {
  discriminant: string;
  value?: Reactive<T>;
};

export const ReactiveChoice = {
  isStatic(choice: AnyReactiveChoice): boolean {
    return choice.value === undefined || Reactive.isStatic(choice.value);
  },

  isDynamic(choice: AnyReactiveChoice): boolean {
    return !ReactiveChoice.isStatic(choice);
  },
};

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
  ): ReactiveCases<C | { discriminant: K }>;
  add<K extends string, T>(
    discriminant: K,
    value: Type<T>
  ): ReactiveCases<C | { discriminant: K; value: Reactive<T> }>;
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
