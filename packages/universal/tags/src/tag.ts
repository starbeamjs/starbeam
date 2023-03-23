import type { Description, UpdateOptions } from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { type Timestamp, zero } from "./timestamp.js";
import { NOW } from "./timestamp.js";

export abstract class Tag
  implements interfaces.AbstractTag, interfaces.TagMethods
{
  static lastUpdatedIn(
    this: void,
    tags: interfaces.List<interfaces.Tag>
  ): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of Tag.dependenciesInList(tags)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  }

  static *dependenciesInList(
    this: void,
    children: interfaces.List<interfaces.Tag>
  ): Iterable<interfaces.CellTag> {
    for (const child of children) {
      yield* child.dependencies();
    }
  }

  abstract readonly type: interfaces.TagType;
  readonly #description: Description;
  constructor(description: Description) {
    this.#description = description;
  }

  get id(): interfaces.ReactiveId {
    return this.#description.id;
  }

  match<T>(matcher: interfaces.Matcher<T>): T {
    const fn = matcher[this.type];
    if (typeof fn === "function") {
      return fn(this as never);
    }

    return (matcher as interfaces.DefaultMatcher<T>).default(
      this as interfaces.Tag
    );
  }

  abstract readonly lastUpdated: Timestamp;

  abstract dependencies(): interfaces.List<interfaces.CellTag>;

  get description(): Description {
    return this.#description;
  }

  /**
   * By default, a tag yields itself when asked for subsbcription target. The
   * delegate tag overrides this behavior.
   */
  *subscriptionTargets(): interfaces.List<interfaces.Tag> {
    yield this as interfaces.Tag;
  }
}

export class CellTag extends Tag implements interfaces.CellTag {
  static create(description: Description, lastUpdated = NOW.bump()): CellTag {
    return new CellTag(description, lastUpdated);
  }

  readonly type = "cell";

  #frozen = false;
  #lastUpdated: Timestamp;

  private constructor(description: Description, lastUpdated: Timestamp) {
    super(description);
    this.#lastUpdated = lastUpdated;
  }

  isFrozen() {
    return this.#frozen;
  }

  freeze() {
    this.#frozen = true;
  }

  get lastUpdated(): Timestamp {
    return this.#lastUpdated;
  }

  set lastUpdated(timestamp: Timestamp) {
    this.#lastUpdated = timestamp;
  }

  override *dependencies(): interfaces.List<interfaces.CellTag> {
    if (!this.#frozen) yield this;
  }

  update({ timeline, stack }: UpdateOptions): void {
    if (this.#frozen) {
      throw TypeError("Cannot update frozen object");
    }

    this.#lastUpdated = timeline.bump(this, stack);
  }
}

export class StaticTag extends Tag implements interfaces.StaticTag {
  static create(description: Description): StaticTag {
    return new StaticTag(description);
  }

  readonly type = "static";

  override readonly lastUpdated = NOW.now;

  override *dependencies(): interfaces.List<interfaces.CellTag> {
    /** static tags have no dependencies */
  }
}

export class FormulaTag extends Tag implements interfaces.FormulaTag {
  static create(
    description: Description,
    children: () => interfaces.List<interfaces.Tagged>
  ): FormulaTag {
    return new FormulaTag(description, children);
  }

  readonly type = "formula";
  readonly #children: () => interfaces.List<interfaces.Tagged>;

  private constructor(
    description: Description,
    children: () => interfaces.List<interfaces.Tagged>
  ) {
    super(description);
    this.#children = children;
  }

  children(): readonly interfaces.Tagged[] {
    return [...this.#children()];
  }

  override get lastUpdated(): interfaces.Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of this.dependencies()) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  }

  override *dependencies(): interfaces.List<interfaces.CellTag> {
    yield* Tag.dependenciesInList(this.children().map((child) => child[TAG]));
  }
}

export class DelegateTag extends Tag implements interfaces.DelegateTag {
  static create(
    description: Description,
    targets: readonly interfaces.Tagged[]
  ): DelegateTag {
    return new DelegateTag(description, targets);
  }

  readonly type = "delegate";
  readonly #targets: readonly interfaces.Tagged[];

  private constructor(
    description: Description,
    targets: readonly interfaces.Tagged[]
  ) {
    super(description);
    this.#targets = targets;
  }

  get targets(): readonly interfaces.Tagged[] {
    return this.#targets;
  }

  override *subscriptionTargets(): interfaces.List<interfaces.Tag> {
    for (const target of this.#targets) {
      yield* target[TAG].subscriptionTargets();
    }
  }

  override *dependencies(): interfaces.List<interfaces.CellTag> {
    for (const target of this.#targets) {
      yield* target[TAG].dependencies();
    }
  }

  override get lastUpdated(): Timestamp {
    return Tag.lastUpdatedIn(this.subscriptionTargets());
  }
}
