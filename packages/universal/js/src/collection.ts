import type { Description, Stack } from "@starbeam/debug";
import { SubscriptionTarget } from "@starbeam/timeline";
import { Cell, Marker } from "@starbeam/universal";
import { expected, isPresent, verified } from "@starbeam/verify";

class ItemState {
  #present: Cell<boolean>;
  #value: Marker;

  static create(
    initialized: boolean,
    description: Description,
    member: string
  ): ItemState {
    return new ItemState(
      Cell(initialized, {
        description: description
          .key(member)
          .asImplementation({ reason: "initialization tracking" }),
      }),
      Marker(description.key(member))
    );
  }

  static initialized(description: Description, member: string): ItemState {
    return ItemState.create(true, description, member);
  }

  static uninitialized(description: Description, member: string): ItemState {
    return ItemState.create(false, description, member);
  }

  constructor(present: Cell<boolean>, value: Marker) {
    this.#present = present;
    this.#value = value;
  }

  check(caller: Stack): void {
    this.#present.read(caller);
  }

  delete(caller: Stack): void {
    this.#present.set(false, caller);
  }

  initialize(): void {
    this.#present.current = true;
  }

  read(caller: Stack): void {
    this.#present.read(caller);
    this.#value.consume(caller);
  }

  update(caller: Stack): void {
    this.#present.current = true;
    this.#value.update(caller);
  }
}

class Item {
  #value: ItemState;

  static initialized(description: Description, member: string): Item {
    // If an item is initialized for the first time with a value, that means
    // that no consumer attempted to read the value before, so there's nothing
    // to do (other than update the iteration of the entire collection).
    return new Item(ItemState.initialized(description, member));
  }

  static uninitialized(
    description: Description,
    member: string,
    caller: Stack
  ): Item {
    const item = new Item(ItemState.uninitialized(description, member));

    // check the item so that subsequent writes to the item will invalidate the
    // read that caused this item to be created
    item.#value.check(caller);

    return item;
  }

  constructor(value: ItemState) {
    this.#value = value;
  }

  check(caller: Stack): void {
    this.#value.check(caller);
  }

  delete(caller: Stack): void {
    this.#value.delete(caller);
  }

  read(caller: Stack): void {
    this.#value.read(caller);
  }

  set(caller: Stack): void {
    this.#value.update(caller);
  }
}

export class Collection<K> {
  #description: Description;
  #items: Map<K, Item>;
  #iteration: Marker | undefined;

  static #objects = new WeakMap<object, Collection<unknown>>();

  static create<K>(description: Description, object: object): Collection<K> {
    const collection = new Collection<K>(
      undefined,
      new Map(),
      description.key("entries")
    );
    Collection.#objects.set(object, collection);
    return collection;
  }

  static for(object: object): Collection<unknown> {
    return verified(
      Collection.#objects.get(object),
      isPresent,
      expected("an reactive ecmascript collection").toHave(
        "an associated internal collection"
      )
    );
  }

  constructor(
    iteration: undefined,
    items: Map<K, Item>,
    description: Description
  ) {
    this.#description = description;
    this.#iteration = iteration;
    this.#items = items;
  }

  check(
    key: K,
    disposition: "hit" | "miss",
    description: string,
    caller: Stack
  ): void {
    let item = this.#items.get(key);

    // If we're checking this key for the first time, we need to initialize the
    // item so that this consumer will be invalidated by subsequent writes.
    if (item === undefined) {
      item = this.#initialize(key, disposition, description, caller);
    }

    // otherwise, read the presence of the key so that this consumer will be
    // invalidated by deletes.
    item.check(caller);
  }

  delete(key: K, caller: Stack): void {
    const item = this.#items.get(key);

    // if there's no item with that key, that means that no consumer read from
    // the key or checked it, so there's nothing to do.
    if (item === undefined) {
      return;
    }

    item.delete(caller);
    this.splice(caller);
  }

  /**
   * The consumer read the value of a key.
   *
   * If the key is not present, that means that this is the first read from the key.
   */
  get(
    key: K,
    disposition: "hit" | "miss",
    description: string,
    caller: Stack
  ): void {
    let item = this.#items.get(key);

    if (item === undefined) {
      item = this.#initialize(key, disposition, description, caller);
    }

    item.read(caller);
  }

  #initialize(
    key: K,
    disposition: "hit" | "miss",
    member: string,
    caller: Stack
  ): Item {
    if (this.#iteration === undefined) {
      this.#iteration = Marker(this.#description);
    }

    let item: Item;
    const iteration = SubscriptionTarget.description(this.#iteration);

    if (disposition === "miss") {
      item = Item.uninitialized(iteration, member, caller);
    } else {
      item = Item.initialized(iteration, member);
    }

    this.#items.set(key, item);
    return item;
  }

  iterateKeys(caller: Stack): void {
    if (this.#iteration === undefined) {
      this.#iteration = Marker(this.#description);
    }

    // remember that we iterated this collection so that consumers of the
    // iteration detect changes to the collection itself.
    this.#iteration.consume(caller);
  }

  set(
    key: K,
    disposition: "key:stable" | "key:changes",
    description: string,
    caller: Stack
  ): void {
    if (disposition === "key:changes") {
      this.splice(caller);
    }

    let item = this.#items.get(key);

    if (item === undefined) {
      item = this.#initialize(key, "hit", description, caller);
      return;
    }

    item.set(caller);

    if (disposition === "key:changes") {
      this.splice(caller);
    }
  }

  splice(caller: Stack): void {
    if (this.#iteration === undefined) {
      // if nobody has iterated this collection, nobody will care that it was modified
      return;
    }

    // if the performance benefits are worth the bookkeeping costs, this code
    // could keep track of which items were present in previous iterations and
    // only update them if the splice affects them.
    //
    // In order words, we could generalize the "special case" for consuming and
    // updating exactly one key for arbitrary groups of keys.
    //
    // Since the bookkeeping costs would be non-trivial, and the costs are
    // limited to code that iterates a collection and mutates it, and most users
    // of Starbeam can used keyed collections, we should make sure the
    // bookkeeping would actually pay for itself before spending the time to
    // implement it.
    this.#iteration.update(caller);
  }
}
