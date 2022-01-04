import { verified } from "../../index";
import { is } from "../../strippable/minimal";
import type { Marker } from "./marker";

const TOKEN_IDS = new WeakMap<object, string>();

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

export interface TokenState {
  readonly token: Token;
  readonly marker: Marker;
}

const TOKEN_MARKERS = new WeakMap<DehydratedToken, TokenState>();

export class DehydratedToken {
  // @internal
  static create(state: TokenState): DehydratedToken {
    return new DehydratedToken(state);
  }

  // @ts-expect-error intentionally unused field for nominal typing
  readonly #token: Token;

  private constructor(state: TokenState) {
    this.#token = state.token;
    TOKEN_MARKERS.set(this, state);
  }
}

// @internal
export function tokenId(token: Token): string {
  return verified(TOKEN_IDS.get(token), is.Present);
}

// @internal
export function markedToken(token: Token, marker: Marker): DehydratedToken {
  return DehydratedToken.create({ token, marker });
}

// @internal
export function tokenState(token: DehydratedToken): TokenState {
  return verified(TOKEN_MARKERS.get(token), is.Present);
}
