// @vitest-environment jsdom

import { type ReactApp, Starbeam, useStarbeamApp } from "@starbeam/react";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";
import {
  createElement,
  type Dispatch,
  type SetStateAction,
  useState,
} from "react";

describe("useStarbeamApp", () => {
  testReact<void, number>(
    "useStarbeamApp maintains a stable instance",
    async (root) => {
      let currentApp: ReactApp | null = null;

      const result = root
        .expectStable()
        .expectHTML((counter) => `<button>${counter}</button>`)
        .render((state) => {
          const [counter, setCounter] = useState(0);
          state.value(counter);
          return createElement(
            Starbeam,
            null,
            react.render(Child, { counter, setCounter })
          );
        });

      function Child(props: {
        counter: number;
        setCounter: Dispatch<SetStateAction<number>>;
      }) {
        currentApp = useStarbeamApp({ feature: "test" });
        return html.button(
          {
            onClick: () => {
              props.setCounter((i) => i + 1);
            },
          },
          String(props.counter)
        );
      }

      expect(currentApp).not.toBeNull();

      {
        const lastApp = currentApp;
        await result.rerender();
        expect(currentApp).toBe(lastApp);
      }

      {
        const lastApp = currentApp;
        await result.find("button").fire.click();
        expect(result.value).toBe(1);
        expect(currentApp).toBe(lastApp);
      }
    }
  );
});
