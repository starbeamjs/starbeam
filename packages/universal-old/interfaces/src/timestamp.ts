export interface Timestamp {
  readonly at: number;

  gt: (other: Timestamp) => boolean;
  eq: (other: Timestamp) => boolean;

  next: () => Timestamp;

  toString: (options?: { format?: "timestamp" }) => string;
}
