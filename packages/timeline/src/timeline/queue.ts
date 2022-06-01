export class Queue {
  static enqueue(notifications: Set<() => void>): Promise<void> {
    return new Queue(notifications).#enqueue();
  }

  #notifications: Set<() => void>;

  constructor(notifications: Set<() => void>) {
    this.#notifications = notifications;
  }

  async #enqueue(): Promise<void> {
    await new Promise((resolve) => {
      queueMicrotask(() => {
        for (const notification of this.#notifications) {
          notification();
        }
        resolve(undefined);
      });
    });
  }
}
