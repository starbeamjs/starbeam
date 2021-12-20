const INTERNAL_TOKEN = new WeakMap<object, string>();

export class Token {
  // @internal
  static of(tokenId: string): Token {
    return new Token(tokenId);
  }

  private constructor(token: string) {
    INTERNAL_TOKEN.set(this, token);
  }
}

// @internal
export function tokenId(token: Token): string {
  return INTERNAL_TOKEN.get(token) as string;
}
