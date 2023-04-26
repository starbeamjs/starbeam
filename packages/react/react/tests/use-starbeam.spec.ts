// @vitest-environment happy-dom

import { Starbeam, useReactive } from "@starbeam/react";
import { Cell, Formula } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import type { RenderState } from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";
import { createElement } from "react";

Error.stackTraceLimit = Infinity;

describe("useStarbeam", () => {
  const testResource = Resource(({ on }) => {
    const cell = Cell(0);

    on.cleanup(() => {
      cell.current = -1;
    });

    return {
      get count() {
        return cell.current;
      },
      increment() {
        cell.set(cell.current + 1);
      },
    };
  });

  interface TestState {
    count: number;
    increment: () => void;
  }

  testReact<void, TestState | undefined>("using a resource", async (root) => {
    const result = root
      .expectHTML((value) => `<span>${value?.count ?? "uninitialized"}</span>`)
      .render((state) => {
        const reactive = useReactive(({ use }) => {
          const resource = use(testResource);

          return Formula(() => {
            state.value(resource.current);
            return html.span(resource.current?.count ?? "uninitialized");
          });
        }, []);

        return reactive;
        // return useReactive(reactive);
      });

    await result.rerender();
    expect(result.value?.count).toBe(0);

    await result.act(() => result.value?.increment());
    expect(result.value?.count).toBe(1);
  });

  testReact<void, TestState | undefined>("using a service", async (root) => {
    const result = root
      .expectHTML((value) => `<span>${value?.count ?? "uninitialized"}</span>`)
      .render((state) =>
        createElement(Starbeam, null, react.render(App, { state }))
      );

    function App({ state }: { state: RenderState<TestState | undefined> }) {
      return useReactive(({ service }) => {
        const resource = service(testResource);

        return Formula(() => {
          state.value(resource.current);
          return html.span(resource.current?.count ?? "uninitialized");
        });
      }, []);
    }

    await result.rerender();
    expect(result.value?.count).toBe(0);

    await result.act(() => result.value?.increment());
    expect(result.value?.count).toBe(1);
  });
});
