import { Abstraction } from "@starbeam/debug";
import { ReactiveMetadata } from "../core/metadata.js";
import type { UNINITIALIZED } from "../fundamental/constants.js";
import type { Cell, Reactive } from "../fundamental/types.js";
import { ExtendsReactive, type ReactiveValue } from "./base.js";
import type { AnyReactiveChoice } from "./choice.js";

export type Matcher<C extends AnyReactiveChoice> = {
  [P in C["discriminant"]]: C["value"] extends undefined
    ? () => unknown
    : (value: C["value"] extends Reactive<infer T> ? T : never) => unknown;
};

export class ReactiveMatch<
  C extends AnyReactiveChoice,
  M extends Matcher<C>
> extends ExtendsReactive<ReturnType<M[C["discriminant"]]>> {
  static match<C extends AnyReactiveChoice, M extends Matcher<C>>(
    reactive: ExtendsReactive<C>,
    matcher: M,
    description = Abstraction.callerFrame()
  ): ReactiveMatch<C, M> {
    return new ReactiveMatch(reactive, matcher, description);
  }

  readonly #reactive: Reactive<C>;
  readonly #matcher: M;

  private constructor(
    reactive: ExtendsReactive<C>,
    matcher: M,
    readonly description: string
  ) {
    super({
      name: "Match",
      description,
    });
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

  get cells(): UNINITIALIZED | readonly Cell[] {
    return this.#reactive.cells;
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
