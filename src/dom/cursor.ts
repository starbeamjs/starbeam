import type { AttrNamespace } from "@simple-dom/interface";
import type {
  AttributeName,
  DomImplementation,
  DomTypes,
} from "./implementation";

export class ChildNodeCursor<T extends DomTypes> {
  static appending<T extends DomTypes>(
    parent: T["element"],
    implementation: DomImplementation<T>
  ): ChildNodeCursor<T> {
    return new ChildNodeCursor(parent, null, implementation);
  }

  static inserting<T extends DomTypes>(
    parent: T["element"],
    nextSibling: T["node"],
    implementation: DomImplementation<T>
  ): ChildNodeCursor<T> {
    return new ChildNodeCursor(parent, nextSibling, implementation);
  }

  readonly #parent: T["element"];
  readonly #nextSibling: T["node"] | null;
  readonly #implementation: DomImplementation<T>;

  private constructor(
    parent: T["element"],
    nextSibling: T["node"] | null,
    implementation: DomImplementation<T>
  ) {
    this.#parent = parent;
    this.#nextSibling = nextSibling;
    this.#implementation = implementation;
  }

  insert(node: T["node"]): ChildNodeCursor<T> {
    this.#implementation.insertChild(node, this.#parent, this.#nextSibling);

    return this;
  }
}

export class Attribute {
  constructor(
    readonly name: string,
    readonly namespace: AttrNamespace | null
  ) {}
}

/// This cursor allows unrestricted access to the attributes of an element. It
/// would be more semantically sound for the cursor to reserve the attributes it
/// intends to control, and for the ownership to be disjoint, just like `Cursor`.
///
/// The exact details of how to make that reservation ergonomic (i.e. how to make
/// it propagate naturally as a consequence of normal use of the API) is TBD, but
/// something we must solve as part of the MVP.
///
/// One part of the solution is probably to make the API for passing attributes
/// a data structure (i.e. `attr("static", reactiveString)`) so that the act of
/// creating an attribute output node also declares its ownership extent.
///
/// The tricky part that requires additional thought relates to effects: effects
/// should be contained to an ownership extent as well, and the ownership extents,
/// in total, should be disjoint.
export class AttrCursor<T extends DomTypes> {
  readonly #parent: T["element"];
  readonly #implementation: DomImplementation<T>;

  constructor(parent: T["element"], implementation: DomImplementation<T>) {
    this.#parent = parent;
    this.#implementation = implementation;
  }

  initialize(name: AttributeName, value: string | null): T["attribute"] {
    return this.#implementation.initializeAttribute(this.#parent, name, value);
  }

  update(
    attribute: T["attribute"],
    value: string,
    lastValue?: string | null
  ): void {
    this.#implementation.updateAttribute(attribute, value, lastValue);
  }

  remove(attribute: T["attribute"], lastValue?: string | null): void {
    this.#implementation.removeAttribute(attribute, lastValue);
  }
}
