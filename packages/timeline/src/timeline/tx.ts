/**
 * This API is a placeholder for better debugging around grouping.
 */
export class Batching {
  batch(description: string, callback: () => void): void {
    const transaction = new BatchingTransaction(description);
    try {
      callback();
    } finally {
      transaction.commit();
    }
  }
}

export class BatchingTransaction {
  #description: string;

  constructor(description: string) {
    this.#description = description;
  }

  commit(): void {
    // noop
  }
}

export const TX = new Batching();
