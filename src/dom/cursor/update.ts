import type * as minimal from "@domtree/minimal";
import { verified } from "../../strippable/assert";
import { is, mutable } from "../../strippable/minimal";
import {
  COMPATIBLE_DOM,
  ContentCursor,
  ContentRange,
  MINIMAL_DOM,
} from "../streaming/compatible-dom";
import { ContentOperationOptions } from "../streaming/tree-constructor";

export interface AbstractUpdateOperation<
  N extends minimal.Node | ContentRange
> {
  /**
   * The concrete node is on the interface so that the updates can be sorted in
   * document order.
   */
  readonly node: N;
  update(token?: UpdateToken): void;
}

type UpdateDataOperation = AbstractUpdateOperation<minimal.CharacterData>;

function UpdateDataOperation(
  node: minimal.CharacterData,
  value: string
): UpdateDataOperation {
  return {
    node,
    update() {
      mutable(node).data = value;
    },
  };
}

type UpdateAttributeOperation = AbstractUpdateOperation<minimal.Attr>;

function RemoveContentOperation(range: ContentRange): RemoveContentOperation {
  return {
    node: range,
    update(token?: UpdateToken) {
      let cursor = MINIMAL_DOM.removeRange(range);

      if (token) {
        UPDATE_TOKEN_NODE.set(token, { state: "applied", cursor });
      }
    },
  };
}

type RemoveContentOperation = AbstractUpdateOperation<ContentRange>;

type UpdateOperation =
  | UpdateDataOperation
  | UpdateAttributeOperation
  | RemoveContentOperation;

function UpdateAttributeOperation(node: minimal.Attr, value: string | null) {
  return {
    node,
    update() {
      COMPATIBLE_DOM.updateAttr(node, value);
    },
  };
}

type UpdateTokenState =
  | { state: "enqueued"; range: ContentRange }
  | { state: "applied"; cursor: ContentCursor };

const UPDATE_TOKEN_NODE = new WeakMap<UpdateToken, UpdateTokenState>();

declare const UPDATE_TOKEN: unique symbol;

/**
 * UpdateToken allows insertion operations to be relative to a node that might
 * have been removed. It works by first replacing any removed nodes with a
 * comment, and then removing the comments once all of the operations have
 * completed.
 */
export class UpdateToken {
  static enqueued(range: ContentRange): UpdateToken {
    return new UpdateToken({ state: "enqueued", range });
  }

  // make UpdateToken nominal
  declare readonly [UPDATE_TOKEN]: UpdateToken;

  private constructor(state: UpdateTokenState) {
    UPDATE_TOKEN_NODE.set(this, state);
  }
}

export class ContentUpdateBuffer {
  static create(): ContentUpdateBuffer {
    return new ContentUpdateBuffer([], []);
  }

  readonly #operations: UpdateOperation[];
  readonly #tokens: UpdateToken[];

  private constructor(operations: UpdateOperation[], tokens: UpdateToken[]) {
    this.#operations = operations;
    this.#tokens = tokens;
  }

  data(node: minimal.CharacterData, value: string): void {
    this.#operations.push(UpdateDataOperation(node, value));
  }

  attr(node: minimal.Attr, value: string | null): void {
    this.#operations.push(UpdateAttributeOperation(node, value));
  }

  remove(range: ContentRange): void;
  remove(range: ContentRange, options: ContentOperationOptions): UpdateToken;
  remove(
    range: ContentRange,
    options?: ContentOperationOptions
  ): UpdateToken | void {
    this.#operations.push(RemoveContentOperation(range));

    if (ContentOperationOptions.requestedToken(options)) {
      return this.#addToken(range);
    }
  }

  #addToken(range: ContentRange): UpdateToken {
    let token = UpdateToken.enqueued(range);
    this.#tokens.push(token);
    return token;
  }
}
