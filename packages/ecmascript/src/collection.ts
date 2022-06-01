import { Cell, Marker } from "@starbeam/core";

class ItemState {
  static uninitialized(description: string): ItemState {
    return new ItemState(Cell(false, description), Marker(description));
  }

  static initialized(description: string): ItemState {
    return new ItemState(Cell(true, description), Marker(description));
  }

  #present: Cell<boolean>;
  #value: Marker;

  constructor(present: Cell<boolean>, value: Marker) {
    this.#present = present;
    this.#value = value;
  }

  check(): void {
    this.#present.current;
  }

  read(): void {
    this.#present.current;
    this.#value.consume();
  }

  initialize(): void {
    this.#present.current = true;
  }

  update() {
    this.#present.current = true;
    this.#value.update();
  }

  delete() {
    this.#present.current = false;
  }
}

class Item {
  static uninitialized(description: string) {
    const item = new Item(description, ItemState.uninitialized(description));

    // check the item so that subsequent writes to the item will invalidate the
    // read that caused this item to be created
    item.#value.check();

    return item;
  }

  static initialized(description: string): Item {
    // If an item is initialized for the first time with a value, that means
    // that no consumer attempted to read the value before, so there's nothing
    // to do (other than update the iteration of the entire collection).
    return new Item(description, ItemState.initialized(description));
  }

  /**
   * The description of the individual item.
   */
  #description: string;

  #value: ItemState;

  constructor(description: string, value: ItemState) {
    this.#description = description;
    this.#value = value;
  }

  check() {
    this.#value.check();
  }

  set() {
    this.#value.update();
  }

  delete(): void {
    this.#value.delete();
  }

  read(): void {
    return this.#value.read();
  }
}

export class Collection<K> {
  static create<K>(description: string): Collection<K> {
    return new Collection<K>(undefined, new Map(), description);
  }

  #iteration: Marker | undefined;
  #items: Map<K, Item>;
  #description: string;

  constructor(iteration: undefined, items: Map<K, Item>, description: string) {
    this.#description = description;
    this.#iteration = iteration;
    this.#items = items;
  }

  iterate(): void {
    if (this.#iteration === undefined) {
      this.#iteration = Marker(this.#description);
    }

    // remember that we iterated this collection so that consumers of the
    // iteration detect changes to the collection itself.
    this.#iteration.consume();
  }

  splice() {
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
    this.#iteration.update();
  }

  check(key: K, disposition: "hit" | "miss") {
    let item = this.#items.get(key);

    // If we're checking this key for the first time, we need to initialize the
    // item so that this consumer will be invalidated by subsequent writes.
    if (item === undefined) {
      item = this.#initialize(key, disposition);
    }

    // otherwise, read the presence of the key so that this consumer will be
    // invalidated by deletes.
    item.check();
  }

  /**
   * The consumer read the value of a key.
   *
   * If the key is not present, that means that this is the first read from the key.
   */
  get(key: K, disposition: "hit" | "miss") {
    let item = this.#items.get(key);

    if (item === undefined) {
      this.#initialize(key, disposition);
      return;
    }

    return item.read();
  }

  set(key: K) {
    let item = this.#items.get(key);

    if (item === undefined) {
      item = this.#initialize(key, "hit");
      return;
    }

    item.set();
  }

  delete(key: K) {
    const item = this.#items.get(key);

    // if there's no item with that key, that means that no consumer read from
    // the key or checked it, so there's nothing to do.
    if (item === undefined) {
      return;
    }

    item.delete();
  }

  #initialize(key: K, disposition: "hit" | "miss"): Item {
    let item: Item;

    if (disposition === "miss") {
      item = Item.uninitialized(`${this.#description} item`);
    } else {
      item = Item.initialized(`${this.#description} item`);
    }

    this.#items.set(key, item);
    return item;
  }
}
