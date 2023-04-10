// @vitest-environment jsdom

import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
