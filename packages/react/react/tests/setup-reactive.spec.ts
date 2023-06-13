// @vitest-environment jsdom

import { setup, useReactive } from "@starbeam/react";
import { Cell, Formula } from "@starbeam/universal";
import { describe } from "@starbeam-workspace/test-utils";

import { testSetupReactive } from "./test-use.js";

describe("setupReactive", () => {
  testSetupReactive("with an external cell", async (test) => {
    const externalCell = Cell(0);

    await test((makeReactive) => {
      const countReactive = makeReactive(externalCell);
      const count = useReactive(countReactive);

      return {
        current: count,
        increment: () => externalCell.current++,
      };
    });
  });

  testSetupReactive("with a cell created via setup()", async (test) => {
    return test((makeReactive) => {
      const cell = setup(() => Cell(0));
      const countReactive = makeReactive(cell);
      const count = useReactive(countReactive);

      return {
        current: count,
        increment: () => {
          return cell.current++;
        },
      };
    });
  });

  testSetupReactive("with a formula created via setup()", async (component) => {
    const externalCell = Cell(0);

    return component((makeReactive) => {
      const formula = setup(() => Formula(() => externalCell.current));
      const countReactive = makeReactive(formula);
      const count = useReactive(countReactive);

      return {
        current: count,
        increment: () => externalCell.current++,
      };
    });
  });
});
