import type { AnyReactiveChoice } from "./choice";
import type { Reactive, ReactiveValue } from "./core";
import { HasMetadata, ReactiveMetadata } from "./metadata";

export type Matcher<C extends AnyReactiveChoice> = {
  [P in C["discriminant"]]: C["value"] extends undefined
    ? () => unknown
    : (value: C["value"] extends Reactive<infer T> ? T : never) => unknown;
};

export class ReactiveMatch<C extends AnyReactiveChoice, M extends Matcher<C>>
  extends HasMetadata
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
    super();
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
    if (this.#reactive.isConstant()) {
      let { value } = this.#reactive.current;

      if (value === undefined) {
        return ReactiveMetadata.Constant;
      } else {
        return value.metadata;
      }
    } else {
      return ReactiveMetadata.Dynamic;
    }
  }
}
