import type { minimal } from "@domtree/flavors";
import type { DomEnvironment } from "../dom";
import type { ContentRange } from "../dom/streaming/compatible-dom";
import type { LazyDOM } from "../dom/streaming/token";
import { verified } from "../strippable/assert";
import { is } from "../strippable/minimal";
import { as } from "../strippable/verify-context";

export class LazyFragment {
  static of(lazy: LazyDOM<ContentRange>): LazyFragment {
    return new LazyFragment(lazy, undefined);
  }

  readonly #lazy: LazyDOM<ContentRange>;
  #placeholder: minimal.ChildNode | null | undefined;

  constructor(
    lazy: LazyDOM<ContentRange>,
    placeholder: minimal.ChildNode | null | undefined
  ) {
    this.#lazy = lazy;
    this.#placeholder = placeholder;
  }

  get environment(): DomEnvironment {
    return this.#lazy.environment;
  }

  initialize(inside: minimal.ParentNode): void {
    this.#lazy.get(inside);
  }

  get(inside: minimal.ParentNode): minimal.ChildNode {
    if (this.#placeholder === undefined) {
      this.#placeholder = verified(
        this.#lazy.get(inside).asNode(),
        is.Comment,
        as(`the ContentRange for a rendered list`).when(`the list was empty`)
      );
    }

    return verified(
      this.#placeholder,
      is.Present,
      as(`The ContentRange for a rendered list`).when(`the list was empty`)
    );
  }

  set(placeholder: minimal.ChildNode | null): void {
    this.#placeholder = placeholder;
  }
}
