export class Queue {
  static #current = new Queue();

  static enqueue(...notifications: (() => void)[]): void {
    Queue.#current.enqueue(...notifications);
  }

  static afterFlush(...callbacks: (() => void)[]): void {
    Queue.#current.afterFlush(...callbacks);
  }

  #started = false;
  #notifications: Set<() => void> = new Set();
  #after: Set<() => void> = new Set();

  #isEmpty() {
    return this.#notifications.size === 0 && this.#after.size === 0;
  }

  enqueue(...notifications: (() => void)[]): void {
    for (const notification of notifications) {
      this.#notifications.add(notification);
    }

    this.#start();
  }

  afterFlush(...callbacks: (() => void)[]): void {
    for (const callback of callbacks) {
      this.#after.add(callback);
    }

    this.#start();
  }

  #start() {
    if (this.#started === false) {
      this.#started = true;

      queueMicrotask(() => {
        this.#flush();
      });
    }
  }

  #flush() {
    Queue.#current = new Queue();

    for (const notification of this.#notifications) {
      notification();
    }

    if (Queue.#current.#isEmpty()) {
      for (const after of this.#after) {
        after();
      }
    } else {
      Queue.#current.afterFlush(...this.#after);
    }
  }
}
