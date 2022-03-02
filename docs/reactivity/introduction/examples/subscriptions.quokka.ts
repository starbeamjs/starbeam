import {
  Cell,
  CONFIG,
  lifetime,
  Memo,
  Priority,
  Reactive,
  reactive,
  subscribe,
  type ReactiveSubscription,
} from "@starbeam/core";

CONFIG.set("DefaultPriority", Priority.Inline);

class Counter {
  static create({
    count,
    increment,
  }: {
    count: Reactive<number>;
    increment: () => void;
  }) {
    let updates: unknown[] = [];
    let description = Memo(() => `[${count.current}]`, "description");

    let subscription = subscribe(
      description,
      (): void => {
        updates; //?
        updates.push(subscription.poll());
        console.log(updates);
      },
      "to description"
    );

    let counter = new Counter(
      count,
      description,
      increment,
      subscription,
      updates
    );

    lifetime.link(counter, subscription);

    return counter;
  }

  readonly #count: Reactive<number>;
  readonly #description: Reactive<string>;
  readonly #increment: () => void;
  readonly #subscription: ReactiveSubscription;
  readonly #updates: unknown[];

  constructor(
    count: Reactive<number>,
    description: Reactive<string>,
    increment: () => void,
    subscription: ReactiveSubscription,
    updates: unknown[]
  ) {
    this.#count = count;
    this.#description = description;
    this.#increment = increment;
    this.#subscription = subscription;
    this.#updates = updates;
  }

  poll() {
    let poll = this.#subscription.poll();

    return {
      count: this.#count.current,
      description: poll.value,
      updates: [...this.#updates],
      // cells: this.#description.cells,
      // subscription: this.#subscription,
    };
  }

  increment() {
    this.#increment();
    return this.poll();
  }
}

{
  const count = Cell(0, "count");

  const counter = Counter.create({
    count,
    increment: () => count.update((count) => count + 1),
  });

  counter.poll(); //?

  counter.increment(); //?
  counter.increment(); //?
  counter.increment(); //?

  lifetime.finalize(counter); //?.
}

{
  const count = reactive({
    i: 0,
  });

  const counter = Counter.create({
    count: Memo(() => count.i),
    increment: () => count.i++,
  });

  counter.poll(); //?
  counter.increment(); //?
  counter.increment(); //?
}

{
  const count: Map<string, number> = reactive(Map);
  count.set("i", 0);

  const counter = Counter.create({
    count: Memo(() => count.get("i")!),
    increment: () => count.set("i", count.get("i")! + 1),
  });

  counter.poll(); //?
  counter.increment(); //?
  counter.increment(); //?
}

{
  const count = Cell(0, "count");

  const updates: unknown[] = [];
  const subscription = subscribe(
    count,
    () => {
      updates.push(subscription.poll());
    },
    "to count"
  );

  subscription; //?
  updates; //?

  subscription.poll();
  updates; //?

  count.set(1);
  subscription; //?
  updates; //?
}

{
  const count = reactive({
    i: 0,
  });

  const cell = Cell(0);

  const desc = Memo(() => `[${cell.current}]`, "description");

  const updates: unknown[] = [];
  const subscription = subscribe(
    desc,
    (): void => {
      updates.push(subscription.poll());
    },
    "to description"
  );

  desc.current; //?
  subscription; //?

  subscription.poll();

  cell.current = cell.current + 1;

  subscription; //?

  updates; //?
}
