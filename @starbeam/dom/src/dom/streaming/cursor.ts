import type { minimal } from "@domtree/flavors";
import { as, assert, is, mutable, verified } from "@starbeam/core";
import type { RenderedContent } from "../../program-node/interfaces/rendered-content.js";
import type { DomEnvironment } from "../environment.js";

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

  mutate(utils: DomEnvironment): MutateContentCursor {
    return MutateContentCursor.mutate(utils, this.parent, this.next);
  }
}

export class MutateContentCursor extends ContentCursor {
  static mutate(
    environment: DomEnvironment,
    parent: minimal.ParentNode,
    next: minimal.ChildNode | null
  ): MutateContentCursor {
    return new MutateContentCursor(environment, parent, next);
  }

  private constructor(
    readonly environment: DomEnvironment,
    parent: minimal.ParentNode,
    next: minimal.ChildNode | null
  ) {
    super(parent, next);
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
      return this.environment.utils.rangeAppendingTo(parent);
    } else {
      return this.environment.utils.rangeAround(next);
    }
  }
}

/**
 * A snapshot of the range for rendered content. This must be used immediately
 * and cannot be saved off.
 */
export class RangeSnapshot {
  static create(
    environment: DomEnvironment,
    first: minimal.ChildNode,
    last: minimal.ChildNode = first
  ): RangeSnapshot {
    let parent = verified(first.parentNode, is.Present);

    assert(
      parent === last.parentNode,
      `The parentNode of the two nodes in a range must be the same`
    );

    return new RangeSnapshot(environment, parent, first, last);
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

  private constructor(
    readonly environment: DomEnvironment,
    readonly parent: minimal.ParentNode,
    readonly first: minimal.ChildNode,
    readonly last: minimal.ChildNode
  ) {}

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

    return new RangeSnapshot(
      this.environment,
      this.parent,
      this.first,
      other.last
    );
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

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let next = verified(
        current.nextSibling,
        is.Present,
        as(`nextSibling when iterating forwards through a RangeSnapshot`)
      );

      to.mutate(this.environment).insert(current);

      if (current === last) {
        break;
      } else {
        current = next;
      }
    }
  }

  #toLiveRange(): minimal.LiveRange {
    return this.environment.utils.rangeAround(this.first, this.last);
  }
}

export const RANGE_SNAPSHOT = "RANGE_SNAPSHOT";
