import { describe, expect, test } from "vitest";

import { stringify } from "./integration.spec-d";

describe("integration test", () => {
  test("runtime test", () => {
    expect(stringify({ a: 1, b: 2, c: 3 })).toBe("{a: 1, b: 2, c: 3}");
  });
});
