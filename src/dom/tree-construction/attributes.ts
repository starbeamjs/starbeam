import type { AnyAttributeName } from "../tree-construction";
import type { AdjustMap } from "./adjust";

// A `TokenizedAttributeName` is always lowercase.
export type TokenizedAttributeName = string;

// A `NormalizedAttributeName` has capital letters if the spec says it should (e.g. viewBox)
export type NormalizedAttributeName = string;

export class TokenizedAttributes {
  readonly #attributes: Map<TokenizedAttributeName, string> = new Map();

  add(name: TokenizedAttributeName, value: string): void {
    // Since this code is meant to be a compiler target and API for higher-level
    // libraries, we should probably add a debug-level assert here that the
    // attribute is lowercase rather than actually transform it.
    this.#attributes.set(name.toLowerCase(), value);
  }

  adjust(adjustments: AdjustMap): Attributes {
    return Attributes.of(adjustments.adjust(this.#attributes));
  }
}

export class Attributes {
  static of(attributes: ReadonlyMap<AnyAttributeName, string>): Attributes {
    return new Attributes(attributes);
  }

  readonly #attributes: ReadonlyMap<AnyAttributeName, string>;

  private constructor(attributes: ReadonlyMap<AnyAttributeName, string>) {
    this.#attributes = new Map(attributes);
  }

  has(name: string): boolean {
    return this.#attributes.has(name);
  }

  get(name: string): string | undefined {
    return this.#attributes.get(name);
  }
}

export interface TokenizedAttributes {
  add(name: string, value: string): void;
  adjust(adustments?: AdjustMap): Attributes;
}
