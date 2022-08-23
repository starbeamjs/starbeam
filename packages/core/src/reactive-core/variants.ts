import type { Stack } from "@starbeam/debug";
import {
  type Description,
  callerStack,
  descriptionFrom,
  DisplayStruct,
} from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import {
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
  TIMELINE,
} from "@starbeam/timeline";

import { CompositeInternals } from "../storage.js";
import { Cell } from "./cell.js";
import { Marker } from "./marker.js";

export class VariantGroups {
  static empty(description: Description): VariantGroups {
    return new VariantGroups(description);
  }

  // variant groups, indexed by pipe-separated names
  readonly #groupsByTypes = new Map<string, VariantGroup>();
  // an index of all variant groups, indexed by each of their members
  readonly #groupsByType = new Map<string, Set<VariantGroup>>();

  readonly #description: Description;

  constructor(description: Description) {
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

  transition(from: string, to: string, caller: Stack): void {
    const fromGroups = this.#groupsByType.get(from);
    const toGroups = this.#groupsByType.get(to);

    if (fromGroups) {
      for (const group of fromGroups) {
        group.transition(to, caller);
      }
    }

    if (toGroups) {
      for (const group of toGroups) {
        group.transition(from, caller);
      }
    }
  }

  #create(types: string[], joined: string): VariantGroup {
    const group = VariantGroup.group(
      types,
      this.#description.detail("is", [types.join(" | ")])
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
  static group(types: string[], description: Description): VariantGroup {
    return new VariantGroup(Marker(description), new Set(types));
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
    this.#marker.consume();
  }

  // Transition to or from another variant. If the variant is not present in this group, then this
  // group is invalidated.
  transition(type: string, caller: Stack): void {
    if (this.#types.has(type)) {
      return;
    }

    this.#marker.update(caller);
  }
}

export class Variant<T> implements ReactiveProtocol {
  static selected<T>(
    type: string,
    typeMarker: Marker,
    value: T,
    description: Description
  ): Variant<T> {
    const val = Cell(value as T | UNINITIALIZED, {
      description: description.implementation({ reason: `${type} cell` }),
    });

    const localTypeMarker = Marker(
      description.implementation({ reason: "selected" })
    );

    return new Variant(
      type,
      typeMarker,
      localTypeMarker,
      val,
      { value },
      CompositeInternals(
        [val, localTypeMarker],
        description.implementation({
          reason: `selected`,
        })
      )
    );
  }

  static deselected<T>(
    type: string,
    typeMarker: Marker,
    description: Description
  ): Variant<T> {
    const val = Cell(UNINITIALIZED as T | UNINITIALIZED);

    const localTypeMarker = Marker(
      description.implementation({ reason: "selected" })
    );

    return new Variant<T | UNINITIALIZED>(
      type,
      typeMarker,
      localTypeMarker,
      val,
      { value: UNINITIALIZED },

      CompositeInternals(
        [val, localTypeMarker],
        description.implementation({ reason: "selected" })
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
      value: variant.#value.current,
    };
  }

  static set<T>(variant: Variant<T>, value: T, caller = callerStack()): void {
    variant.#value.set(value, caller);
  }

  static select<T>(variant: Variant<T>, caller = callerStack()): void {
    variant.#localTypeMarker.update(caller);
  }

  static deselect<T>(variant: Variant<T>, caller = callerStack()): void {
    variant.#localTypeMarker.update(caller);
  }

  static consumeType(variant: Variant<unknown>): void {
    variant.#localTypeMarker.consume();
  }

  readonly #type: string;
  readonly #sharedTypeMarker: Marker;
  readonly #localTypeMarker: Marker;
  readonly #debug: {
    value: T | UNINITIALIZED;
  };
  readonly #value: Cell<T | UNINITIALIZED>;
  readonly [REACTIVE]: ReactiveInternals;

  private constructor(
    type: string,
    sharedTypeMarker: Marker,
    localTypeMarker: Marker,
    value: Cell<T | UNINITIALIZED>,
    debug: { value: T | UNINITIALIZED },
    reactive: ReactiveInternals
  ) {
    this.#type = type;
    this.#sharedTypeMarker = sharedTypeMarker;
    this.#localTypeMarker = localTypeMarker;
    this.#debug = debug;
    this.#value = value;
    this[REACTIVE] = reactive;
  }

  get type(): string {
    this.#sharedTypeMarker.consume();
    return this.#type;
  }

  get value(): T {
    return this.#value.current as T;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Variant", {
      type: this.#type,
      value: this.#debug.value,
    });
  }
}

export type VariantType = Record<string, unknown>;

type UnitVariantName<V extends VariantType> = {
  [K in keyof V]: V[K] extends void ? K : never;
}[keyof V];
type ValueVariantName<V extends VariantType> = {
  [K in keyof V]: V[K] extends void ? never : K;
}[keyof V];

export type VariantEntry<V extends VariantType> = {
  [K in keyof V]: K extends string
    ? V[K] extends void
      ? { type: K; value?: undefined }
      : { type: K; value: V[K] }
    : never;
}[keyof V];

type VariantConstructors<V extends VariantType> = {
  [K in keyof V]: V[K] extends void
    ? () => Variants<V>
    : (value: V[K]) => Variants<V>;
};

type Matcher<V extends VariantType, T> = {
  [K in keyof V]: V[K] extends void ? T : (value: V[K]) => T;
};

interface InternalVariant {
  type: string;
  value?: unknown;
}

export interface ReadonlyVariants<V extends VariantType, K extends keyof V> {
  readonly current: {
    [P in K]: K extends string
      ? V[P] extends void
        ? { type: P }
        : { type: P; value: V[P] }
      : never;
  }[K];

  is<T extends K>(
    ...keys: T[]
  ): this is Omit<this, "current"> & ReadonlyVariants<V, T>;
}

export interface Variants<V extends VariantType, Narrow = V>
  extends ReactiveProtocol {
  current: {
    [K in keyof Narrow]: K extends string
      ? Narrow[K] extends void
        ? { type: K }
        : { type: K; value: Narrow[K] }
      : never;
  }[keyof Narrow];
  choose(name: UnitVariantName<V>): void;
  choose<N extends ValueVariantName<V>>(name: N, value: V[N]): void;

  is<K extends (keyof V)[]>(
    ...keys: K
  ): this is Variants<V, Pick<Narrow, K[number] & keyof Narrow>>;

  match<M extends Matcher<V, unknown>>(
    matcher: M
  ): M[keyof M] extends (...args: any[]) => infer R ? R : M[keyof M];
  match<M extends Partial<Matcher<V, unknown>>>(
    matcher: M
  ):
    | {
        [K in keyof M]: M[K] extends (...args: any[]) => infer R ? R : never;
      }[keyof M]
    | undefined;
}

class VariantsImpl implements ReactiveProtocol {
  static create(
    value: InternalVariant,
    description: Description
  ): VariantsImpl {
    const variants: Record<string, Variant<unknown>> = {};
    const typeMarker = Marker(description.key("type"));

    const current = Variant.selected(
      value.type,
      typeMarker,
      value.value,
      description.key(value.type)
    );
    variants[value.type] = current;

    return new VariantsImpl(variants, typeMarker, description, current);
  }

  readonly #variants: Record<string, Variant<unknown>>;
  readonly #typeMarker: Marker;
  readonly #groups: VariantGroups;
  readonly #description: Description;
  #current: Variant<unknown>;

  private constructor(
    variants: Record<string, Variant<unknown>>,
    type: Marker,
    description: Description,
    current: Variant<unknown>
  ) {
    this.#variants = variants;
    this.#typeMarker = type;
    this.#groups = VariantGroups.empty(description);
    this.#description = description;
    this.#current = current;
  }

  get [REACTIVE](): ReactiveInternals {
    return CompositeInternals([this.#current]);
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

    const current = Variant.type(this.#current);

    if (current in matcher) {
      const value = matcher[current];

      if (typeof value === "function") {
        return value(this.#current.value);
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
    const caller = callerStack();
    const current = this.#current;
    const from = Variant.type(current);

    if (from === type) {
      Variant.set(current, value);
      return;
    }

    Variant.deselect(current);
    this.#groups.transition(from, type, caller);

    const existing = this.#variants[type] as Variant<unknown> | undefined;

    if (existing) {
      Variant.set(existing, value);
      Variant.select(existing);
      this.#current = existing;
    } else {
      this.#current = this.#create(type, ["selected", value]);
    }

    this.#typeMarker.update(caller);
    // this.#current.consumeType();
    TIMELINE.update(this);
  }

  #get(type: string): Variant<unknown> {
    const existing = this.#variants[type] as Variant<unknown> | undefined;

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
    const variant =
      create === "deselected"
        ? Variant.deselected(
            type,
            this.#typeMarker,
            this.#description.key(type)
          )
        : Variant.selected(
            type,
            this.#typeMarker,
            create[1],
            this.#description.key(type)
          );
    this.#variants[type] = variant;

    return variant;
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
  const desc = descriptionFrom({
    type: "variants",
    api: {
      package: "@starbeam/core",
      name: "Variants",
    },
    fromUser: description,
  });
  const target: Record<string, (value: unknown) => VariantsImpl> = {};
  return new Proxy(target, {
    get(target, name) {
      if (typeof name === "symbol" || RESERVED.has(name)) {
        return Reflect.get(target, name) as unknown;
      }

      let existing = target[name];
      if (!existing) {
        existing = (value?: unknown) => {
          return VariantsImpl.create({ type: name, value }, desc);
        };
        target[name] = existing;
      }

      return target[name];
    },
  }) as unknown as VariantConstructors<V>;
}
