import type { AnyReactiveChoice } from "./choice";
import { Reactive, ReactiveMetadata, ReactiveValue } from "./core";

export type Matcher<C extends AnyReactiveChoice> = {
  [P in C["discriminant"]]: C["value"] extends undefined
    ? () => unknown
    : (value: C["value"] extends Reactive<infer T> ? T : never) => unknown;
};

export class ReactiveMatch<C extends AnyReactiveChoice, M extends Matcher<C>>
  implements Reactive<ReturnType<M[C["discriminant"]]>>
{
  static match<C extends AnyReactiveChoice, M extends Matcher<C>>(
    reactive: Reactive<C>,
    matcher: M
  ): ReactiveMatch<C, M> {
    return new ReactiveMatch(reactive, matcher);
  }

  #reactive: Reactive<C>;
  #matcher: M;

  private constructor(reactive: Reactive<C>, matcher: M) {
    this.#reactive = reactive;
    this.#matcher = matcher;
  }

  get current(): ReturnType<M[C["discriminant"]]> {
    let { discriminant, value } = this.#reactive.current;

    let matcher = this.#matcher[discriminant as keyof M];

    return matcher(
      value?.current as ReactiveValue<NonNullable<C["value"]>>
    ) as ReturnType<M[keyof M]>;
  }

  get metadata(): ReactiveMetadata {
    if (Reactive.isStatic(this.#reactive)) {
      let { value } = this.#reactive.current;
      return {
        isStatic: value === undefined ? true : Reactive.isStatic(value),
      };
    }

    return { isStatic: false };
  }
}
