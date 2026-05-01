import { DEBUG } from "@starbeam/universal";
import { expect, test } from "vitest";

test("source import bootstraps DEBUG in development", () => {
  if (import.meta.env.DEV) {
    expect(DEBUG?.Desc("cell")).not.toBe(undefined);
    expect(DEBUG?.callerStack()).not.toBe(undefined);
  } else {
    expect(DEBUG).toBe(undefined);
  }
});
