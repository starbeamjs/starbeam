/**
 * Everything in this file is, in principle, strippable.
 */

/**
 * The strippable usage pattern is:
 *
 * ```ts
 * let name = QualifiedName("xlink:actuate");
 * console.log(Wrapper.getInner(name));
 * ```
 *
 * which is stripped to:
 *
 * ```ts
 * let name = "xlink:actuate";
 * console.log(name);
 * ```
 *
 * If you want to run code that is explicitly for debug-mode only, then you can
 * use this usage pattern:
 *
 * ```ts
 * let person = Wrapper.withMeta({ name: "Tom" }, { description: "Person" });
 * Wrapper.inDebug(person, (person, meta) => {
 *   console.group(meta.description);
 *   console.log(`%cName:%c ${person.name}`, "color: red", "color: black");
 *   console.groupEnd();
 * })
 * ```
 *
 * Which gets stripped to:
 *
 * ```ts
 * let person = { name: "Tom" };
 * ```
 */
export class Wrapper<T, Meta, S extends symbol> {
  static of<T, S extends symbol>(value: T, symbol: S): Wrapper<T, null, S> {
    return new Wrapper(null, symbol, value);
  }

  static withMeta<T, S extends symbol, Meta>(
    value: T,
    meta: Meta,
    symbol: S
  ): Wrapper<T, Meta, S> {
    return new Wrapper(meta, symbol, value);
  }

  /**
   * @strip.value newtype
   */
  static getInner<T>(newtype: AnyWrapper<T>): T {
    return newtype.#inner;
  }

  /**
   * @strip.noop
   */
  static inDebug<T, Meta>(
    newtype: AnyWrapper<T, Meta>,
    callback: (value: T, meta: Meta) => void
  ): void {
    callback(newtype.#inner, newtype.#debugMeta);
  }

  #debugMeta: Meta;
  // Unused field for nominal typing
  #symbol: S;
  #inner: T;

  private constructor(debugMeta: Meta, symbol: S, inner: T) {
    this.#debugMeta = debugMeta;
    this.#symbol = symbol;
    this.#inner = inner;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnsafeAny = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyKey = keyof any;

export type AnyRecord = Record<AnyKey, unknown>;

export type AnyWrapper<T, Meta = unknown> = Wrapper<T, Meta, UnsafeAny>;

export interface OpaqueMetadata {
  description: string;
}

/**
 * An opaque alias is a simple wrapper around a value that exists (in this
 * codebase) purely to distinguish different variants of the same underlying
 * type (like localName vs. qualifiedName).
 */
export type OpaqueAlias<T, S extends symbol> = Wrapper<T, OpaqueMetadata, S>;

const QUALIFIED_NAME = Symbol("QUALIFIED_NAME");

export type QualifiedName = OpaqueAlias<string, typeof QUALIFIED_NAME>;

/**
 * @strip.value name
 */
export function QualifiedName(name: string): QualifiedName {
  return Wrapper.withMeta(
    name,
    { description: "QualifiedName" },
    QUALIFIED_NAME
  );
}

const LOCAL_NAME = Symbol("LOCAL_NAME");

export type LocalName = OpaqueAlias<string, typeof LOCAL_NAME>;

/**
 * @strip.value name
 */
export function LocalName(name: string): LocalName {
  return Wrapper.withMeta(name, { description: "LocalName" }, LOCAL_NAME);
}
