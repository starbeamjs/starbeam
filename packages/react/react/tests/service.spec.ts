/* eslint-disable @typescript-eslint/no-magic-numbers */
// @vitest-environment jsdom

import { Cell, Resource } from "@starbeam/universal";
import { describeInDev } from "@starbeam-workspace/test-utils";

import { testService } from "./test-use.js";

describeInDev("services", () => {
  testService("CountResource", async (test) => {
    await test((service) => service(CountResource));
  });
});

const CountResource = Resource(({ on }) => {
  const counter = Cell(0);
  let isActive = true;

  on.sync(() => () => (isActive = false));

  return {
    get isActive() {
      return isActive;
    },

    get current() {
      return counter.current;
    },
    increment: () => counter.current++,
  };
});
