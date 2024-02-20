import { describe, expect, test } from "tstyche";

import { isPresent } from "./value.js";

describe("type checks", () => {
  test("truthy | null | undefined", () => {
    {
      const x: number | null = 1;

      if (isPresent(x)) {
        expect(x).type.toEqual<number>();
      }
    }

    {
      const x: number | undefined = 1;

      if (isPresent(x)) {
        expect(x).type.toEqual<number>();
      }
    }

    {
      const x: number | void = 1;

      if (isPresent(x)) {
        expect(x).type.toEqual<number>();
      }
    }

    {
      const x: number = 1;

      if (isPresent(x)) {
        expect(x).type.toEqual<number>();
      }
    }

    {
      const x: number | null | undefined = 1;

      if (isPresent(x)) {
        expect(x).type.toEqual<number>();
      }
    }
  });

  test("falsey | null | undefined", () => {
    {
      // even though 0 is falsy, it is still present
      const x: number | null = 0;

      if (isPresent(x)) {
        expect(x).type.toEqual<number>();
      }
    }

    {
      // even though "" is falsy, it is still present
      const x: string | null = "";

      if (isPresent(x)) {
        expect(x).type.toEqual<string>();
      }
    }
  });
});
