export interface CoreTimestamp {
  readonly at: number;
}

export interface Timestamp extends CoreTimestamp {
  gt: (other: Timestamp) => boolean;
  eq: (other: Timestamp) => boolean;

  next: () => Timestamp;

  toString: (options?: { format?: "timestamp" }) => string;
}

export interface TimestampStatics {
  now: () => Timestamp;
  max: (...timestamps: Timestamp[]) => Timestamp;
  debug: (timestamp: Timestamp) => { at: number };
}
