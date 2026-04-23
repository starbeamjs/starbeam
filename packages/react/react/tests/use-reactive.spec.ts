/* eslint-disable @typescript-eslint/no-magic-numbers */
// @vitest-environment jsdom

import { useSetup } from "@starbeam/react";
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

  testUseReactive("with a cell created via useSetup()", async (test) => {
    return test((use) => {
      const cell = useSetup(() => Cell(0));
      const count = use(cell);

      return {
        current: count,
        increment: () => cell.current++,
      };
    });
  });

  testUseReactive("with a formula created via useSetup()", async (test) => {
    const externalCell = Cell(0);

    return test((use) => {
      const formula = useSetup(() => Formula(() => externalCell.current));
      const count = use(formula);

      return {
        current: count,
        increment: () => externalCell.current++,
      };
    });
  });
});
