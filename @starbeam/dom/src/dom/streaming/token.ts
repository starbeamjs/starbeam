import type { minimal } from "@domtree/flavors";
import { isPresent, verified } from "@starbeam/verify";
import type { DomEnvironment } from "../environment.js";
import { MINIMAL } from "./compatible-dom.js";
import type { ContentCursor } from "./cursor.js";
import type { Hydration, Marker } from "./marker.js";

const TOKEN_IDS = new WeakMap<object, string>();

export class Tokens {
  static create(environment: DomEnvironment): Tokens {
    return new Tokens(environment, 0);
  }

  #id: number;

  private constructor(readonly environment: DomEnvironment, id: number) {
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

    return Dehydrated.create(this.environment, token, marker.hydrator);
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
    environment: DomEnvironment,
    token: Token,
    hydrator: Hydration<Hydrated>
  ): Dehydrated<Hydrated> {
    return new Dehydrated(environment, token, hydrator);
  }

  /**
   * @internal
   */
  static hydrate<Hydrated>(
    environment: DomEnvironment,
    hydrator: Dehydrated<Hydrated>,
    container: minimal.ParentNode
  ): Hydrated {
    return hydrator.#hydrator.hydrate(environment, container, hydrator.#token);
  }

  readonly #environment: DomEnvironment;
  readonly #token: Token;
  readonly #hydrator: Hydration<Hydrated>;

  private constructor(
    readonly environment: DomEnvironment,
    token: Token,
    hydrator: Hydration<Hydrated>
  ) {
    this.#environment = environment;
    this.#token = token;
    this.#hydrator = hydrator;
  }

  get dom(): LazyDOM<Hydrated> {
    return LazyDOM.create(this.#environment, this);
  }
}

export class LazyDOM<Hydrated> {
  static create<Hydrated>(
    environment: DomEnvironment,
    dehydrated: Dehydrated<Hydrated>
  ) {
    return new LazyDOM(environment, dehydrated, null);
  }

  readonly #dehydrated: Dehydrated<Hydrated>;
  #node: Hydrated | null;

  private constructor(
    readonly environment: DomEnvironment,
    dehyrated: Dehydrated<Hydrated>,
    node: Hydrated | null
  ) {
    this.#dehydrated = dehyrated;
    this.#node = node;
  }

  get(inside: minimal.ParentNode): Hydrated {
    if (this.#node === null) {
      this.#node = Dehydrated.hydrate(
        this.environment,
        this.#dehydrated,
        inside
      );
    }

    return this.#node;
  }

  insert(this: LazyDOM<minimal.ChildNode>, at: ContentCursor): void {
    MINIMAL.insert(this.get(at.parent), at);
  }
}

// @internal
export function tokenId(token: Token): string {
  return verified(TOKEN_IDS.get(token), isPresent);
}
