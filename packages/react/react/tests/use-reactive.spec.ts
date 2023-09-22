// @vitest-environment jsdom

import { setup, setupReactive } from "@starbeam/react";
import { Cell, Formula } from "@starbeam/universal";
import { describeInDev } from "@starbeam-workspace/test-utils";

import { testUseReactive } from "./test-use.js";

describeInDev("useReactive", () => {
  testUseReactive("with an external cell", async (test) => {
    const externalCell = Cell(0);

    await test((use) => {
      const count = use(externalCell);

      return {
        current: count,
        increment: () => externalCell.current++,
      };
    });
  });

  testUseReactive("with a cell created via setup()", async (test) => {
    return test((use) => {
      const cell = setup(() => Cell(0));
      const count = use(cell);

      return {
        current: count,
        increment: () => cell.current++,
      };
    });
  });

  testUseReactive("with a formula created via setup()", async (test) => {
    const externalCell = Cell(0);

    return test((use) => {
      const formula = setup(() => Formula(() => externalCell.current));
      const count = use(formula);

      return {
        current: count,
        increment: () => externalCell.current++,
      };
    });
  });

  testUseReactive(
    "with a formula created via setupReactive()",
    async (component) => {
      const externalCell = Cell(0);

      return component((use) => {
        const formula = setupReactive(() =>
          Formula(() => externalCell.current),
        );
        const count = use(formula);

        return {
          current: count,
          increment: () => externalCell.current++,
        };
      });
    },
  );
});
