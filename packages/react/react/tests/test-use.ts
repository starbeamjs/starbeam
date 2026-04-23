import type { Reactive } from "@starbeam/interfaces";
import { useReactive, useService } from "@starbeam/react";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import type {
  RenderState,
  SetupTestRender,
} from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { expect } from "@starbeam-workspace/test-utils";

import { usingStarbeam } from "./support/render.js";

const INITIAL_COUNT = 0;
const INCREMENT = 1;

/**
 * A test-component setup that produces a reactive value the test can
 * increment. Used by `testUseReactive` and `testService` to share the
 * click-and-verify harness without each test re-implementing it.
 */
export interface ReactiveComponent {
  current: number;
  increment: () => void;
}

type ReactiveFactory = <T>(reactive: Reactive<T>) => T;
type ServiceFactory = <T>(blueprint: IntoResourceBlueprint<T>) => T;

type DefineUseReactiveComponent = (
  test: (unwrap: ReactiveFactory) => ReactiveComponent
) => Promise<void>;

type DefineServiceComponent = (
  test: (useService: ServiceFactory) => ReactiveComponent
) => Promise<void>;

/**
 * Test a component that reads a `Reactive<number>` via `useReactive`.
 * The only supported shape is `useReactive(() => reactive.current)` —
 * the API no longer offers the `useReactive(reactive)` unwrap overload
 * or the deps-array form. See docs/INVARIANTS.md §17.
 */
export function testUseReactive(
  name: string,
  define: (component: DefineUseReactiveComponent) => void | Promise<void>,
): void {
  testReact<void, number>(name, async (root) =>
    define(async (test) =>
      expectValidReactive(root, () =>
        test((reactive) => useReactive(() => reactive.current)),
      ),
    ),
  );
}

/**
 * Test a component that resolves a service via `useService`. The
 * surface is a single shape (`useService(blueprint)`); the historic
 * hand-rolled variants (`useReactive(({ service }) => service(b), [])`,
 * nested `useSetupReactive` calls) are all subsumed by `useService`'s
 * implementation.
 */
export function testService(
  name: string,
  define: (component: DefineServiceComponent) => void | Promise<void>,
): void {
  testReact<void, number>(name, async (root) =>
    define(async (test) =>
      expectValidReactive(root, () =>
        test((blueprint) => useService(blueprint)),
      ),
    ),
  );
}

async function expectValidReactive(
  root: SetupTestRender<void, number>,
  define: () => ReactiveComponent,
): Promise<void> {
  const result = await root
    .expectHTML((value) => `<p>${value}</p><button>++</button>`)
    .render((state) => usingStarbeam(App, { state }));

  function App({ state }: { state: RenderState<number> }) {
    const instance = define();

    return useReactive(
      () => {
        state.value(instance.current);

        return react.fragment(
          html.p(String(instance.current)),
          html.button({ onClick: instance.increment }, "++"),
        );
      },
      [instance],
    );
  }

  expect(result.value).toBe(INITIAL_COUNT);

  await result.find("button").fire.click();

  expect(result.value).toBe(INITIAL_COUNT + INCREMENT);
}
