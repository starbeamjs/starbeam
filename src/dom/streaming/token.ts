const INTERNAL_TOKEN = new WeakMap<object, string>();

export class Token {
  // @internal
  static of(tokenId: string): Token {
    return new Token(tokenId);
  }

  // @ts-expect-error intentionally unused field for nominal typing
  readonly #token: string;

  private constructor(token: string) {
    this.#token = token;
    INTERNAL_TOKEN.set(this, token);
  }
}

// @internal
export function tokenId(token: Token): string {
  return INTERNAL_TOKEN.get(token) as string;
}
