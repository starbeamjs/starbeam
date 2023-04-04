import { DisplayStruct } from "@starbeam/debug";
import type { Description, UpdateOptions } from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";

import { type Timestamp, zero } from "./timestamp.js";
import { NOW } from "./timestamp.js";

const INSPECT = Symbol.for("nodejs.util.inspect.custom");

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
  abstract readonly initialized: boolean;
  abstract readonly subscriptionTargets: readonly interfaces.SubscriptionTarget[];

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

  abstract dependencies(): readonly interfaces.CellTag[];

  get description(): Description {
    return this.#description;
  }
}

export class CellTag extends Tag implements interfaces.CellTag {
  static create(description: Description, lastUpdated = NOW.bump()): CellTag {
    return new CellTag(description, lastUpdated);
  }

  readonly type = "cell";
  readonly initialized = true;

  #frozen = false;
  #lastUpdated: Timestamp;

  private constructor(description: Description, lastUpdated: Timestamp) {
    super(description);
    this.#lastUpdated = lastUpdated;
  }

  [INSPECT]() {
    return DisplayStruct("Cell", {
      id: this.description.id,
      lastUpdated: this.lastUpdated,
    });
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

  get subscriptionTargets(): readonly interfaces.SubscriptionTarget[] {
    return [this as interfaces.SubscriptionTarget];
  }

  override dependencies(): interfaces.CellTag[] {
    return this.#frozen ? [] : [this];
  }

  update({ runtime }: UpdateOptions): void {
    if (this.#frozen) {
      throw TypeError("Cannot update frozen object");
    }

    const { notify, revision } = runtime.subscriptions.bump(this);
    this.#lastUpdated = revision;
    notify();
  }
}

export class StaticTag extends Tag implements interfaces.StaticTag {
  static create(description: Description): StaticTag {
    return new StaticTag(description);
  }

  readonly type = "static";
  readonly initialized = true;

  override readonly lastUpdated = NOW.now;

  get subscriptionTargets(): readonly interfaces.SubscriptionTarget[] {
    return [];
  }

  override dependencies(): readonly interfaces.CellTag[] {
    return [];
  }
}

export class FormulaTag extends Tag implements interfaces.FormulaTag {
  static create(
    description: Description,
    children: () => interfaces.List<interfaces.Tag>
  ): FormulaTag {
    return new FormulaTag(description, children, false);
  }

  readonly type = "formula";
  readonly #children: () => interfaces.List<interfaces.Tag>;
  #initialized: boolean;

  private constructor(
    description: Description,
    children: () => interfaces.List<interfaces.Tag>,
    initialized: boolean
  ) {
    super(description);
    this.#children = children;
    this.#initialized = initialized;
  }

  [INSPECT]() {
    return DisplayStruct("Formula", {
      id: this.description.id,
      initialized: this.#initialized,
      children: [...this.#children()],
    });
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  markInitialized(): void {
    this.#initialized = true;
  }

  children(): readonly interfaces.Tag[] {
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

  override dependencies(): interfaces.CellTag[] {
    return this.children().flatMap((child) => child.dependencies());
  }

  get subscriptionTargets(): readonly interfaces.SubscriptionTarget[] {
    return [this];
  }
}

export class DelegateTag extends Tag implements interfaces.DelegateTag {
  static create(
    description: Description,
    targets: readonly interfaces.Tag[]
  ): DelegateTag {
    return new DelegateTag(description, targets);
  }

  readonly type = "delegate";
  readonly #targets: readonly interfaces.Tag[];
  readonly #subscriptionTargets: readonly interfaces.SubscriptionTarget[];

  private constructor(
    description: Description,
    targets: readonly interfaces.Tag[]
  ) {
    super(description);
    this.#targets = targets;
    this.#subscriptionTargets = targets.flatMap(
      (target) => target.subscriptionTargets
    );
  }

  get initialized(): boolean {
    return this.#targets.every((target) => target.initialized);
  }

  get targets(): readonly interfaces.Tag[] {
    return this.#targets;
  }

  get subscriptionTargets(): readonly interfaces.SubscriptionTarget[] {
    return this.#subscriptionTargets;
  }

  override dependencies(): readonly interfaces.CellTag[] {
    return this.#targets.flatMap((target) => target.dependencies());
  }

  override get lastUpdated(): Timestamp {
    return Tag.lastUpdatedIn(this.subscriptionTargets);
  }
}
