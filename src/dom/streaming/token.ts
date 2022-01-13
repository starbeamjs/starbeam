import type { minimal } from "@domtree/flavors";
import { verified } from "../../strippable/assert";
import { is } from "../../strippable/minimal";
import { MINIMAL_DOM } from "./compatible-dom";
import type { ContentCursor } from "./cursor";
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

  get dom(): LazyDOM<Hydrated> {
    return LazyDOM.of(this);
  }
}

export class LazyDOM<Hydrated> {
  static of<Hydrated>(dehydrated: Dehydrated<Hydrated>) {
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

  insert(this: LazyDOM<minimal.ChildNode>, at: ContentCursor): void {
    MINIMAL_DOM.insert(this.get(at.parent), at);
  }
}

// @internal
export function tokenId(token: Token): string {
  return verified(TOKEN_IDS.get(token), is.Present);
}
