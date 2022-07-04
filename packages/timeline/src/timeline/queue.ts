/**
 * The `Queue` handles the three-phase lifecycle of the timeline.
 *
 * 1. `actions`: Actions are allowed to read **and** mutate reactive state. In general, an action
 *    begins inside of an event handler or async continuation (the callbacks to `then` or the code
 *    that runs after an `await`). Actions may also read from the output, but must not mutate it.
 * 2. `render`: Renders **read** from reactive state and use it to update the UI. They **must not**
 *    write to reactive state, but they may write to the output.
 * 3. `afterRender`: After Renders convert output state into reactive state. After Renders can
 *    easily create infinite loops, and they should carefully ensure that the state they are writing
 *    to will not change the output in a way that would cause the process to repeat indefinitely.
 *
 * After Renders are important for modelling reactive layouts, but because they read outputs back
 * into inputs, they can easily create problems, and should be used with care.
 */
export class Queue {
  static readonly #current = new Queue();

  static enqueueAction(...notifications: (() => void)[]): void {
    Queue.#current.action(...notifications);
  }

  static enqueueRender(...callbacks: (() => void)[]): void {
    Queue.#current.render(...callbacks);
  }

  static enqueueAfterRender(...callbacks: (() => void)[]): void {
    Queue.#current.afterRender(...callbacks);
  }

  static idle(): Promise<void> {
    if (Queue.#current.#isEmpty()) {
      return Promise.resolve();
    }
    return Queue.#current.#defer.promise;
  }

  #phase: "pending" | "started" | "actions" | "render" | "afterRender" =
    "pending";
  readonly #actions: Set<() => void> = new Set();
  readonly #renders: Set<() => void> = new Set();
  readonly #afterRender: Set<() => void> = new Set();
  #defer = defer<void>();

  #isEmpty() {
    return (
      this.#actions.size === 0 &&
      this.#renders.size === 0 &&
      this.#afterRender.size === 0
    );
  }

  action(...notifications: (() => void)[]): void {
    for (const notification of notifications) {
      this.#actions.add(notification);
    }

    // Start the phases, but if the actions don't cause any renders to be enqueued, then we won't
    // flush the render phase yet, and we'll return to the "pending" phase.
    this.#start();
  }

  render(...callbacks: (() => void)[]): void {
    for (const callback of callbacks) {
      this.#renders.add(callback);
    }

    this.#start();
  }

  afterRender(...callbacks: (() => void)[]) {
    for (const callback of callbacks) {
      this.#afterRender.add(callback);
    }

    // afterRender callbacks don't trigger a `start` because they're purely reactive to renders
    // occurring.
  }

  /**
   * This is a private method that is used to start the next phase of the queue. It is called by
   * `flush`, but only does anything if the phase is `pending`.
   */
  #start() {
    if (this.#phase === "pending") {
      this.#phase = "started";

      queueMicrotask(() => {
        this.#flush();
      });
    }
  }

  // #fulfill() {
  //   this.#defer.fulfill();

  //   for (const fulfillParent of this.#fulfillParents) {
  //     fulfillParent();
  //   }
  // }

  #hasPendingWork() {
    return !this.#isEmpty();
  }

  #flushActions() {
    if (this.#actions.size > 0) {
      this.#phase = "actions";
      const actions = [...this.#actions];
      this.#actions.clear();

      for (const action of actions) {
        action();
      }

      this.#flushActions();
    }
  }

  #flushRenders() {
    if (this.#renders.size > 0) {
      this.#phase = "render";
      const renders = [...this.#renders];
      this.#renders.clear();

      for (const render of renders) {
        render();
      }
    }
  }

  #flushAfterRender() {
    if (this.#afterRender.size > 0) {
      this.#phase = "afterRender";
      const afterRender = [...this.#afterRender];
      this.#afterRender.clear();

      for (const callback of afterRender) {
        callback();
      }
    }
  }

  #flush() {
    // If the queue is empty, then don't do anything. In particular, we definitely don't want to
    // resolve the `idle` promise if nothing at all happened.
    if (this.#isEmpty()) {
      return;
    }

    while (this.#hasPendingWork()) {
      while (this.#actions.size > 0 || this.#renders.size > 0) {
        // flush actions until they're empty
        this.#flushActions();
        // flush renders; if renders enqueue more actions or renders, they'll be flushed again
        this.#flushRenders();
      }

      // once actions and renders are empty, flush afterRender; if afterRender enqueues more actions
      // or renders, they'll be flushed again
      this.#flushAfterRender();
    }

    // resolve the "idle queue" promise
    this.#defer.fulfill();
    // create a new defer for the next phase
    this.#defer = defer<void>();
    this.#phase = "pending";
  }
}

function defer<T>(): {
  fulfill: (value: T) => void;
  reject: (reason: Error) => void;
  promise: Promise<T>;
} {
  let f: (value: T) => void;
  let r: (reason: Error) => void;

  const promise = new Promise<T>((fulfill, reject) => {
    f = fulfill;
    r = reject;
  });

  return {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fulfill: f!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    reject: r!,
    promise,
  };
}
