import type * as minimal from "@domtree/minimal";
import { DehydratedToken, tokenState } from "../../dom/streaming/token";
import type { RenderedAttribute } from "../attribute";
import type { RenderedContent, RenderedProgramNode } from "../program-node";

export class Dehydrated<R extends RenderedProgramNode> {
  static node<N extends minimal.ChildNode, R extends RenderedProgramNode>(
    token: DehydratedToken,
    render: (node: N) => R
  ): Dehydrated<R> {
    return new Dehydrated(token, render as (node: unknown) => R);
  }

  static attribute(
    token: DehydratedToken,
    render: (node: minimal.Attr) => RenderedAttribute
  ): Dehydrated<RenderedAttribute> {
    return new Dehydrated(
      token,
      render as (node: unknown) => RenderedAttribute
    );
  }

  readonly #token: DehydratedToken;
  readonly #render: (node: unknown) => R;

  private constructor(
    readonly token: DehydratedToken,
    render: (node: unknown) => R
  ) {
    this.#token = token;
    this.#render = render;
  }

  hydrate(container: minimal.ParentNode): R {
    let { marker, token } = tokenState(this.#token);
    let node = marker.hydrate(container, token);
    return this.#render(node);
  }
}

export type DehydratedContent = Dehydrated<RenderedContent>;
export type DehydratedAttribute = Dehydrated<RenderedAttribute>;
