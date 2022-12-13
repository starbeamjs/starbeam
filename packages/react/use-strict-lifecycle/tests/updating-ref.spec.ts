// @vitest-environment jsdom

import { type Ref, useUpdatingRef } from "@starbeam/use-strict-lifecycle";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { expect } from "vitest";

testReact<void, { count: number; state: string }>(
  "testReact (testing the test infra)",
  async (root) => {
    await root
      .expectHTML(
        ({ count, state }) => `<p>count = ${count}</p><p>state = ${state}</p>`
      )
      .render((test) => {
        const count = useRef(0);
        const [state, setState] = useState("initial");

        useLayoutEffect(() => {
          setState("layout:setup");
          test.value({ count: count.current, state });

          return () => {
            test.value({ count: count.current, state });
            setState("layout:cleanup");
          };
        }, []);

        useEffect(() => {
          test.value({ count: count.current, state });
          setState("effect:setup");

          return () => {
            test.value({ count: count.current, state });
            setState("effect:cleanup");
          };
        }, []);

        test.value({ count: count.current, state });

        return react.fragment(
          html.p("count = ", String(count.current)),
          html.p("state = ", state)
        );
      });
  }
);

testReact<void, Ref<{ count: number }>>(
  "useUpdatingRef",
  async (root, mode) => {
    const result = await root
      .expectStable((value) => value)
      .expectHTML((ref) => `${ref.current.count}`)
      .render((test) => {
        const { ref } = useUpdatingRef({
          initial: () => ({ count: 0 }),
          update: (counter) => {
            counter.count++;
            return counter;
          },
        });

        test.value(ref);

        return react.fragment(ref.current.count);
      }, undefined);

    const ref = result.value;

    expect(ref.current.count).toBe(0);

    await result.rerender();

    expect(ref.current.count).toBe(
      mode.match({
        loose: () => 1,
        strict: () => 2,
      })
    );
  }
);
