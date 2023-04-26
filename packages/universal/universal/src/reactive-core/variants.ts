import { DisplayStruct } from "@starbeam/core-utils";
import type { Description, FormulaTag } from "@starbeam/interfaces";
import { Cell, DEBUG, Marker } from "@starbeam/reactive";
import { RUNTIME, type Tagged } from "@starbeam/runtime";
import { TAG } from "@starbeam/runtime";
import { UNINITIALIZED } from "@starbeam/shared";
import { getTag, initializeFormulaTag } from "@starbeam/tags";

export class VariantGroups {
  static empty(description: Description | undefined): VariantGroups {
    return new VariantGroups(description);
  }

  // variant groups, indexed by pipe-separated names
  readonly #groupsByTypes = new Map<string, VariantGroup>();
  // an index of all variant groups, indexed by each of their members
  readonly #groupsByType = new Map<string, Set<VariantGroup>>();

  readonly #description: Description | undefined;

  constructor(description: Description | undefined) {
    this.#description = description;
  }

  consume(types: readonly string[]): void {
    this.#get([...types].sort()).consume();
  }

  #get(types: readonly string[]): VariantGroup {
    const sorted = [...types].sort();
    const joined = sorted.join("|");
    let group = this.#groupsByTypes.get(joined);

    if (!group) {
      group = this.#create(sorted, joined);
    }

    return group;
  }

  transition(from: string, to: string): void {
    const fromGroups = this.#groupsByType.get(from);
    const toGroups = this.#groupsByType.get(to);

    if (fromGroups) {
      for (const group of fromGroups) {
        group.transition(to);
      }
    }

    if (toGroups) {
      for (const group of toGroups) {
        group.transition(from);
      }
    }
  }

  #create(types: string[], joined: string): VariantGroup {
    const group = VariantGroup.group(
      types,
      this.#description?.detail("formula", "is", [types.join(" | ")])
    );

    for (const type of types) {
      let groups = this.#groupsByType.get(type);

      if (!groups) {
        groups = new Set();
        this.#groupsByType.set(type, groups);
      }

      groups.add(group);
    }

    this.#groupsByTypes.set(joined, group);
    return group;
  }
}

export class VariantGroup {
  static group(
    types: string[],
    description: Description | undefined
  ): VariantGroup {
    return new VariantGroup(Marker({ description }), new Set(types));
  }

  readonly #marker: Marker;
  readonly #types: Set<string>;

  private constructor(marker: Marker, types: Set<string>) {
    this.#marker = marker;
    this.#types = types;
  }

  has(type: string): boolean {
    return this.#types.has(type);
  }

  consume(): void {
    this.#marker.read();
  }

  // Transition to or from another variant. If the variant is not present in this group, then this
  // group is invalidated.
  transition(type: string): void {
    if (this.#types.has(type)) {
      return;
    }

    this.#marker.mark();
  }
}

export class Variant<T> implements Tagged<FormulaTag> {
  static selected<T>(
    type: string,
    typeMarker: Marker,
    value: T,
    description: Description | undefined
  ): Variant<T> {
    const val = Cell(value as T | UNINITIALIZED, {
      description: description?.implementation("cell", type, `${type} cell`),
    });

    const localTypeMarker = Marker({
      description: description?.implementation(
        "cell",
        "selected:local",
        "selected"
      ),
    });

    return new Variant(
      type,
      typeMarker,
      localTypeMarker,
      val,
      { value },
      initializeFormulaTag(
        description?.implementation("formula", "selected", "selected"),
        () => new Set([getTag(val), getTag(localTypeMarker)])
      )
    );
  }

  static deselected<T>(
    type: string,
    typeMarker: Marker,
    description: Description | undefined
  ): Variant<T> {
    const val = Cell(UNINITIALIZED as T | UNINITIALIZED);

    const localTypeMarker = Marker({
      description: description?.implementation(
        "cell",
        "selected:local",
        "selected"
      ),
    });

    return new Variant<T | UNINITIALIZED>(
      type,
      typeMarker,
      localTypeMarker,
      val,
      { value: UNINITIALIZED },

      initializeFormulaTag(
        description?.implementation("formula", "selected", "selected"),
        () => new Set([getTag(val), getTag(localTypeMarker)])
      )
    ) as Variant<T>;
  }

  static type(variant: Variant<unknown>): string {
    // don't consume the type
    return variant.#type;
  }

  static value(variant: Variant<unknown>): { type: string; value: unknown } {
    return {
      type: variant.type,
      value: variant.#value.read(),
    };
  }

  static set<T>(variant: Variant<T>, value: T): void {
    variant.#value.set(value);
  }

  static select<T>(variant: Variant<T>): void {
    variant.#localTypeMarker.mark();
  }

  static deselect<T>(variant: Variant<T>): void {
    variant.#localTypeMarker.mark();
  }

  static consumeType(variant: Variant<unknown>): void {
    variant.#localTypeMarker.read();
  }

  readonly #type: string;
  readonly #sharedTypeMarker: Marker;
  readonly #localTypeMarker: Marker;
  readonly #debug: {
    value: T | UNINITIALIZED;
  };
  readonly #value: Cell<T | UNINITIALIZED>;
  readonly [TAG]: FormulaTag;

  private constructor(
    type: string,
    sharedTypeMarker: Marker,
    localTypeMarker: Marker,
    value: Cell<T | UNINITIALIZED>,
    debug: { value: T | UNINITIALIZED },
    reactive: FormulaTag
  ) {
    this.#type = type;
    this.#sharedTypeMarker = sharedTypeMarker;
    this.#localTypeMarker = localTypeMarker;
    this.#debug = debug;
    this.#value = value;
    this[TAG] = reactive;
  }

  get type(): string {
    this.#sharedTypeMarker.read();
    return this.#type;
  }

  get value(): T {
    return this.#value.read() as T;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Variant", {
      type: this.#type,
      value: this.#debug.value,
    });
  }
}

export type VariantType = object;

type UnitVariantName<V extends VariantType> = {
  [K in keyof V]: V[K] extends [] ? K : never;
}[keyof V];
type ValueVariantName<V extends VariantType> = {
  [K in keyof V]: V[K] extends [] ? never : K;
}[keyof V];

export type VariantEntry<V extends VariantType> = {
  [K in keyof V]: K extends string
    ? V[K] extends []
      ? { type: K; value?: undefined }
      : { type: K; value: V[K] }
    : never;
}[keyof V];

type VariantConstructors<V extends VariantType> = {
  [K in keyof V]: (...args: V[K] & unknown[]) => Variants<V>;
};

type Matcher<V extends VariantType, T> = {
  [K in keyof V]: (...value: V[K] & unknown[]) => T;
};

interface InternalVariant {
  type: string;
  value?: unknown;
}

export interface ReadonlyVariants<V extends VariantType, K extends keyof V> {
  readonly current: {
    [P in K]: K extends string
      ? V[P] extends []
        ? { type: P }
        : { type: P; value: V[P] }
      : never;
  }[K];

  is: <T extends K>(
    ...keys: T[]
  ) => this is Omit<this, "current"> & ReadonlyVariants<V, T>;
}

export interface Variants<V extends VariantType, Narrow = V> extends Tagged {
  current: {
    [K in keyof Narrow]: K extends string
      ? Narrow[K] extends []
        ? { type: K }
        : Narrow[K] extends [infer Single]
        ? { type: K; value: Single }
        : { type: K; value: Narrow[K] }
      : never;
  }[keyof Narrow];
  choose: ((name: UnitVariantName<V>) => void) &
    (<N extends ValueVariantName<V>>(
      name: N,
      ...value: V[N] & unknown[]
    ) => void);

  is: <K extends (keyof V)[]>(
    ...keys: K
  ) => this is Variants<V, Pick<Narrow, K[number] & keyof Narrow>>;

  match: (<M extends Matcher<V, unknown>>(
    matcher: M
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => M[keyof M] extends (...args: any[]) => infer R ? R : M[keyof M]) &
    (<M extends Partial<Matcher<V, unknown>>>(
      matcher: M
    ) =>
      | {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [K in keyof M]: M[K] extends (...args: any[]) => infer R ? R : never;
        }[keyof M]
      | undefined);
}

class VariantsImpl implements Tagged<FormulaTag> {
  static create(
    value: InternalVariant,
    description: Description | undefined
  ): VariantsImpl {
    const variants: Record<string, Variant<unknown>> = {};
    const typeMarker = Marker({ description: description?.key("type") });

    const current = Variant.selected(
      value.type,
      typeMarker,
      value.value,
      description?.key(value.type)
    );
    variants[value.type] = current;

    return new VariantsImpl(variants, typeMarker, description, current);
  }

  readonly #variants: Record<string, Variant<unknown>>;
  readonly #typeMarker: Marker;
  readonly #groups: VariantGroups;
  readonly #description: Description | undefined;
  readonly [TAG]: FormulaTag;
  #current: Variant<unknown>;

  private constructor(
    variants: Record<string, Variant<unknown>>,
    type: Marker,
    description: Description | undefined,
    current: Variant<unknown>
  ) {
    this.#variants = variants;
    this.#typeMarker = type;
    this.#groups = VariantGroups.empty(description);
    this.#description = description;
    this.#current = current;
    this[TAG] = initializeFormulaTag(
      description,
      () => new Set([getTag(this.#current)])
    );
  }

  get current(): Variant<unknown> {
    return this.#current;
  }

  set current(variant: InternalVariant) {
    this.choose(variant.type, variant.value);
  }

  match<T>(matcher: Matcher<VariantType, T>): T | undefined {
    const types = Object.keys(matcher);
    this.#groups.consume(types);

    for (const key of Object.keys(matcher)) {
      const variant = this.#get(key);
      Variant.consumeType(variant);
    }

    const current = Variant.type(this.#current) as keyof Matcher<
      VariantType,
      T
    >;

    if (current in matcher) {
      const value = matcher[current] as
        | ((value: Variant<unknown>["value"]) => T)
        | T;

      if (typeof value === "function") {
        return (value as (value: Variant<unknown>["value"]) => T)(
          this.#current.value
        );
      } else {
        return value;
      }
    } else {
      return undefined;
    }
  }

  is(...keys: string[]): boolean {
    this.#groups.consume(keys);

    const current = Variant.type(this.#current);
    return keys.some((key) => current === key);
  }

  choose(type: string, value?: unknown): void {
    DEBUG?.markEntryPoint([
      "object:call",
      this.#description ?? "Variants",
      "choose",
    ]);

    const current = this.#current;
    const from = Variant.type(current);

    if (from === type) {
      Variant.set(current, value);
      return;
    }

    Variant.deselect(current);
    this.#groups.transition(from, type);

    const existing = this.#variants[type];

    if (existing) {
      Variant.set(existing, value);
      Variant.select(existing);
      this.#current = existing;
    } else {
      this.#current = this.#create(type, ["selected", value]);
    }

    this.#typeMarker.mark();
    RUNTIME.update(this[TAG]);
  }

  #get(type: string): Variant<unknown> {
    const existing = this.#variants[type];

    if (existing) {
      return existing;
    } else {
      return this.#create(type, "deselected");
    }
  }

  #create(
    type: string,
    create: "deselected" | ["selected", unknown]
  ): Variant<unknown> {
    if (create === "deselected") {
      return (this.#variants[type] = Variant.deselected(
        type,
        this.#typeMarker,
        this.#description?.key(type)
      ));
    } else {
      const [, value] = create;
      return (this.#variants[type] = Variant.selected(
        type,
        this.#typeMarker,
        value,
        this.#description?.key(type)
      ));
    }
  }
}

const RESERVED = new Set(["toJSON", "inspect"]);
// properties on Object.prototype
for (const name of Object.keys(
  Object.getOwnPropertyDescriptors(Object.prototype)
)) {
  RESERVED.add(name);
}

export function Variants<V extends VariantType>(
  description?: string | Description
): VariantConstructors<V> {
  const desc = DEBUG?.Desc("collection", description, "Variants");
  const target: Record<string, (value: unknown) => VariantsImpl> = {};
  return new Proxy(target, {
    get(getTarget, name) {
      if (typeof name === "symbol" || RESERVED.has(name)) {
        return Reflect.get(getTarget, name) as unknown;
      }

      let existing = getTarget[name];
      if (!existing) {
        existing = (value?: unknown) => {
          return VariantsImpl.create({ type: name, value }, desc);
        };
        getTarget[name] = existing;
      }

      return getTarget[name];
    },
  }) as unknown as VariantConstructors<V>;
}
