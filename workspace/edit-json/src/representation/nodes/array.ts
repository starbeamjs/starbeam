import {
  DisplayNewtype,
  FIRST_OFFSET,
  isEmptyArray,
  LAST_OFFSET,
} from "@starbeam/core-utils";
import type { JsonValue } from "@starbeam-workspace/json";

import { modifications } from "../../edits/api.js";
import type { UniqueInsertOption } from "../../edits/array/insert.js";
import type { JsonModification } from "../../edits/edits.js";
import type { JsoncValueNode, JsonValueNode } from "../node.js";
import type { RawJsonArray } from "../raw.js";
import type { SourceRange } from "../source.js";
import { getRange } from "./abstract.js";
import { BaseNode } from "./base.js";
import { intoValueNode } from "./convert.js";
import { assertValueNode } from "./utils.js";

export class JsonArrayNode extends BaseNode<RawJsonArray, JsonValue[]> {
  get [Symbol.toStringTag](): string {
    return "JsonArray";
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayNewtype(this.inner.type, this.value, {
      annotation: getRange(this).format(),
    });
  }

  get children(): JsonValueNode[] {
    return this.inner.children.map((child, i) =>
      intoValueNode(this.root, child as JsoncValueNode, [...this.path, i]),
    );
  }

  /**
   * Gets the child element at the given offset. Negative offsets are
   * supported, and work the same way as {@linkcode Array.prototype.at}.
   */
  at(offset: number): JsonValueNode | undefined {
    const child = this.inner.children.at(offset);
    if (!child) return undefined;

    assertValueNode(child, "an item in an array");
    return intoValueNode(this.root, child, [...this.path, offset]);
  }

  innerRange(options?: { whitespace: "include" }): SourceRange {
    return options?.whitespace === "include"
      ? getRange(this).inner
      : this.root.rangeAtCursors(getRange(this).inner);
  }

  // TODO: removeMatching(check: (value: JsonValue) => boolean)

  /**
   * Remove an element at the given offset.
   */
  removeAt(offset: number): JsonModification {
    const node = this.at(offset);

    if (!node) {
      if (this.inner.children === undefined) {
        throw Error(
          `BUG: attempted to remove an element at ${offset}, but the node has no children`,
        );
      } else {
        throw Error(
          `BUG: attempted to remove an element at ${offset}, but the node only has ${this.raw.children?.length} children`,
        );
      }
    }

    return modifications.array.remove(this.root, this, this.path, offset);
  }

  removeMatches(check: (value: JsonValue) => boolean): JsonModification {
    return modifications.array.removeMatches(this.root, this, this.path, check);
  }

  /**
   * Insert an element into the array at the specified offset.
   *
   * By default, the new element will be inserted at the end of the array and is
   * inserted unconditionally (even if the value is already present).
   */
  insert(
    value: JsonValue,
    { after, unique = false }: { unique?: UniqueInsertOption; after: number },
  ): JsonModification {
    return modifications.array.insert(this.root, this, this.path, value, {
      position: "after",
      after,
      unique,
    });
  }

  prepend(
    value: JsonValue,
    { unique = false }: { unique?: UniqueInsertOption } = {},
  ): JsonModification {
    return modifications.array.insert(this.root, this, this.path, value, {
      unique,
      position: "start",
    });
  }

  append(
    value: JsonValue,
    { unique = false }: { unique?: UniqueInsertOption } = {},
  ): JsonModification {
    return modifications.array.insert(this.root, this, this.path, value, {
      unique,
      position: "end",
    });
  }

  get length(): number {
    return this.inner.children.length;
  }

  get isEmpty(): boolean {
    return isEmptyArray(this.inner.children);
  }

  get first(): JsonValueNode | undefined {
    return this.at(FIRST_OFFSET);
  }

  get last(): JsonValueNode | undefined {
    if (this.isEmpty) return undefined;

    return this.at(LAST_OFFSET);
  }
}
