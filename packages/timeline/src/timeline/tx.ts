import type { Description } from "@starbeam/debug";

/**
 * This API is a placeholder for better debugging around grouping.
 */
export class Batching {
  batch(
    [operation, description]: [operation: string, description: Description],
    callback: () => void
  ): void {
    const transaction = new BatchingTransaction(operation, description);
    try {
      callback();
    } finally {
      transaction.commit();
    }
  }
}

export class BatchingTransaction {
  #operation: string;
  #description: Description;

  constructor(operation: string, description: Description) {
    this.#operation = operation;
    this.#description = description;
  }

  commit(): void {
    // noop
  }
}

export const TX = new Batching();
