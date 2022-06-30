// @vitest-environment jsdom

import {
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { expect } from "vitest";

import { useUpdatingRef } from "../src/updating-ref.js";

testStrictAndLoose("useUpdatingRef", (mode) => {
  const result = mode
    .test(() => {
      const ref = useUpdatingRef({
        initial: () => ({ count: 0 }),
        update: (counter) => {
          counter.count++;
          return counter;
        },
      });

      return {
        value: ref,
        dom: react.fragment(ref.current.count),
      };
    })
    .expectStableValue()
    .expectHTML(({ current: counter }) => `${counter.count}`);

  const ref = result.value;

  expect(result.count).toBe(mode.match({ strict: () => 2, loose: () => 1 }));
  expect(ref.current.count).toBe(0);

  result.rerender();

  expect(ref.current.count).toBe(
    mode.match({
      loose: () => 1,
      strict: () => 2,
    })
  );
});
