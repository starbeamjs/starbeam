import type { minimal } from "@domtree/flavors";
import type { RenderedContent } from "../../program-node/interfaces/rendered-content";
import { verified } from "../../strippable/assert";
import { assert } from "../../strippable/core";
import { is, mutable } from "../../strippable/minimal";
import { as } from "../../strippable/verify-context";
import type { DomEnvironment } from "../environment";
import type { MinimalDocumentUtilities } from "./compatible-dom";

export class ContentCursor {
  static create(
    parent: minimal.ParentNode,
    next: minimal.ChildNode | null
  ): ContentCursor {
    return new ContentCursor(parent, next);
  }

  static verified(
    parent: minimal.ParentNode | null,
    next: minimal.ChildNode | null
  ): ContentCursor {
    return ContentCursor.create(verified(parent, is.Present), next);
  }

  protected constructor(
    readonly parent: minimal.ParentNode,
    readonly next: minimal.ChildNode | null
  ) {}

  mutate(utils: MinimalDocumentUtilities): MutateContentCursor {
    return MutateContentCursor.mutate(utils, this.parent, this.next);
  }
}

export class MutateContentCursor extends ContentCursor {
  static mutate(
    utils: MinimalDocumentUtilities,
    parent: minimal.ParentNode,
    next: minimal.ChildNode | null
  ): MutateContentCursor {
    return new MutateContentCursor(utils, parent, next);
  }

  readonly #utils: MinimalDocumentUtilities;

  private constructor(
    utils: MinimalDocumentUtilities,
    parent: minimal.ParentNode,
    next: minimal.ChildNode | null
  ) {
    super(parent, next);
    this.#utils = utils;
  }

  insertHTML(html: string): void {
    let range = this.#asRange();
    let fragment = range.createContextualFragment(html);
    this.insert(fragment);
  }

  insert(node: minimal.ChildNode | minimal.DocumentFragment): void {
    mutable(this.parent).insertBefore(node, this.next);
  }

  #asRange(): minimal.LiveRange {
    let { parent, next } = this;
    if (next === null) {
      return this.#utils.rangeAppendingTo(parent);
    } else {
      return this.#utils.rangeAround(next);
    }
  }
}

export const RANGE_SNAPSHOT = Symbol("RANGE_SNAPSHOT");

/**
 * A snapshot of the range for rendered content. This must be used immediately
 * and cannot be saved off.
 */
export class RangeSnapshot {
  static create(
    utils: MinimalDocumentUtilities,
    first: minimal.ChildNode,
    last: minimal.ChildNode = first
  ): RangeSnapshot {
    if (first.parentNode == null) {
      debugger;
    }

    let parent = verified(first.parentNode, is.Present);

    assert(
      parent === last.parentNode,
      `The parentNode of the two nodes in a range must be the same`
    );

    return new RangeSnapshot(utils, parent, first, last);
  }

  static forContent(
    inside: minimal.ParentNode,
    start: RenderedContent,
    end?: RenderedContent
  ): RangeSnapshot {
    if (end) {
      let first = start[RANGE_SNAPSHOT](inside);
      let last = end[RANGE_SNAPSHOT](inside);

      return first.join(last);
    } else {
      return start[RANGE_SNAPSHOT](inside);
    }
  }

  readonly #utils: MinimalDocumentUtilities;

  private constructor(
    utils: MinimalDocumentUtilities,
    readonly parent: minimal.ParentNode,
    readonly first: minimal.ChildNode,
    readonly last: minimal.ChildNode
  ) {
    this.#utils = utils;
  }

  get environment(): DomEnvironment {
    return this.#utils.environment;
  }

  get before(): ContentCursor {
    return ContentCursor.create(this.parent, this.first);
  }

  get after(): ContentCursor {
    return ContentCursor.create(this.parent, this.last.nextSibling);
  }

  join(other: RangeSnapshot): RangeSnapshot {
    assert(
      this.parent === other.parent,
      `When joining two range snapshots, both must have the same parent, but the snapshot you passed to join() has a different parent than the snapshot you were joining it to.`
    );

    // TODO: Verify that `this` precedes `other`

    return new RangeSnapshot(this.#utils, this.parent, this.first, other.last);
  }

  remove(): ContentCursor {
    let range = this.#toLiveRange();
    let cursor = ContentCursor.create(this.parent, this.last.nextSibling);

    range.deleteContents();

    return cursor;
  }

  move(to: ContentCursor): void {
    let { first, last } = this;
    let current = first;

    while (current !== last) {
      let next = verified(
        current.nextSibling,
        is.Present,
        as(`nextSibling when iterating forwards through a RangeSnapshot`)
      );

      to.mutate(this.#utils).insert(current);

      current = next;
    }
    while (current !== this.last);
  }

  #toLiveRange(): minimal.LiveRange {
    return this.#utils.rangeAround(this.first, this.last);
  }
}
