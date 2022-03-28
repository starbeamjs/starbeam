import { abstractify } from "@starbeam/trace-internals";

export const narrow: <T, U extends T>(
  value: T,
  predicate: (input: T) => asserts input is U
) => U = abstractify(
  <T, U extends T>(value: T, predicate: (input: T) => asserts input is U) => {
    predicate(value);
    return value;
  }
);
