import { isPresentCollection } from "@starbeam/core-utils";
import type { CellTag } from "@starbeam/interfaces";
import { isPresent, verified, verify } from "@starbeam/verify";

import type { Subscriptions } from "./subscriptions.js";

export class NotificationQueue {
  #subscriptions: Subscriptions;
  #notifications = new Set<CellTag>();
  #scheduled:
    | undefined
    | {
        promise: Promise<void>;
        fulfill: () => void;
      };

  constructor(subscriptions: Subscriptions) {
    this.#subscriptions = subscriptions;
  }

  async next(): Promise<void> {
    if (this.#scheduled) {
      return this.#scheduled.promise;
    } else {
      return Promise.resolve();
    }
  }

  #initialize() {
    if (this.#scheduled) return;

    let next: undefined | (() => void);
    const promise = new Promise<void>((fulfill) => {
      next = fulfill;
    });

    verify(next, isPresent);

    this.#scheduled = {
      promise,
      fulfill: next,
    };

    queueMicrotask(() => {
      this.#flush();
    });
  }

  notify(cell: CellTag): void {
    this.#notifications.add(cell);
    this.#initialize();
  }

  #flush(): void {
    this.#notifications = new Set();
    const scheduled = verified(this.#scheduled, isPresent);

    while (isPresentCollection(this.#notifications)) {
      const notifications = this.#notifications;
      this.#notifications = new Set();

      for (const cell of notifications) {
        this.#subscriptions.queuedNotify(cell);
      }
    }

    scheduled.fulfill();
    this.#scheduled = undefined;
  }
}
