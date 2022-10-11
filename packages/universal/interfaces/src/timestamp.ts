export interface Timestamp {
  gt(other: Timestamp): boolean;
  eq(other: Timestamp): boolean;

  next(): Timestamp;
}

export interface TimestampStatics {
  now(): Timestamp;
  max(...timestamps: Timestamp[]): Timestamp;
  debug(timestamp: Timestamp): { at: number };
}
