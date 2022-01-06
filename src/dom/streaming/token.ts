import type { minimal } from "@domtree/flavors";
import { verified } from "../../index";
import { is } from "../../strippable/minimal";
import type { Hydration, Marker } from "./marker";

const TOKEN_IDS = new WeakMap<object, string>();

export class Tokens {
  static create(): Tokens {
    return new Tokens(0);
  }

  #id: number;

  private constructor(id: number) {
    this.#id = id;
  }

  nextToken(): Token {
    return Token.of(String(this.#id++));
  }

  mark<B, Out>(
    buffer: B,
    marker: Marker<B, Out>,
    body?: (buffer: B) => B
  ): Dehydrated<Out> {
    let token = this.nextToken();
    marker.mark(buffer, token, body);

    return Dehydrated.create(token, marker.hydrator);
  }
}

export class Token {
  // @internal
  static of(tokenId: string): Token {
    return new Token(tokenId);
  }

  // @ts-expect-error intentionally unused field for nominal typing
  readonly #id: string;

  private constructor(token: string) {
    this.#id = token;
    TOKEN_IDS.set(this, token);
  }
}

export class Dehydrated<Hydrated = unknown> {
  /**
   * @internal
   */
  static create<Hydrated>(
    token: Token,
    hydrator: Hydration<Hydrated>
  ): Dehydrated<Hydrated> {
    return new Dehydrated(token, hydrator);
  }

  /**
   * @internal
   */
  static hydrate<Hydrated>(
    hydrator: Dehydrated<Hydrated>,
    container: minimal.ParentNode
  ): Hydrated {
    return hydrator.#hydrator.hydrate(container, hydrator.#token);
  }

  readonly #token: Token;
  readonly #hydrator: Hydration<Hydrated>;

  private constructor(token: Token, hydrator: Hydration<Hydrated>) {
    this.#token = token;
    this.#hydrator = hydrator;
  }
}

export class LazyDOM<Hydrated> {
  static create<Hydrated>(dehydrated: Dehydrated<Hydrated>) {
    return new LazyDOM(dehydrated, null);
  }

  readonly #dehydrated: Dehydrated<Hydrated>;
  #node: Hydrated | null;

  private constructor(dehyrated: Dehydrated<Hydrated>, node: Hydrated | null) {
    this.#dehydrated = dehyrated;
    this.#node = node;
  }

  get(inside: minimal.ParentNode): Hydrated {
    if (this.#node === null) {
      this.#node = Dehydrated.hydrate(this.#dehydrated, inside);
    }

    return this.#node;
  }
}

// @internal
export function tokenId(token: Token): string {
  return verified(TOKEN_IDS.get(token), is.Present);
}
