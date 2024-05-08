import type { Reactive } from "@starbeam/interfaces";
import { setupReactive, useReactive, useService } from "@starbeam/react";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import type {
  RenderState,
  SetupTestRender,
} from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";

import { usingStarbeam } from "./support/render.js";

const INITIAL_COUNT = 0;
const INCREMENT = 1;

type SetupReactiveStyle = <T>(reactive: Reactive<T>) => Reactive<T>;
type UseReactiveStyle = <T>(reactive: Reactive<T>) => T;
type ServiceStyle = <T>(reactive: IntoResourceBlueprint<T>) => T;

const SETUP_REACTIVE_CASES: Record<string, SetupReactiveStyle> = {
  "taking a Reactive<T> (`setupReactive(reactive)`)": (reactive) =>
    setupReactive(reactive),
  "returning a Reactive<T> (`setupReactive(() => reactive)`)": (reactive) =>
    setupReactive(() => reactive),
  "using a Reactive<T> (`setupReactive(() => reactive.current)`)": (reactive) =>
    setupReactive(() => reactive.current),
};

const USE_REACTIVE_CASES: Record<string, UseReactiveStyle> = {
  "taking a Reactive<T> (`useReactive(reactive)`)": (reactive) =>
    useReactive(reactive),
  "returning a Reactive<T> (`useReactive(() => reactive, [])`)": (reactive) =>
    useReactive(() => reactive, []),
  "using a Reactive<T> (`useReactive(() => reactive.current, [])`)": (
    reactive
  ) => useReactive(() => reactive.current, []),
};

const SERVICE_CASES: Record<string, ServiceStyle> = {
  "useService: (`useService(blueprint)`)": (blueprint) => useService(blueprint),
  "useReactive: (`useReactive(({ service }) => service(blueprint), [])`)": (
    blueprint
  ) => useReactive(({ service }) => service(blueprint), []),
  "setupReactive -> useReactive": (blueprint) => {
    const instance = setupReactive(({ service }) => service(blueprint));
    return useReactive(instance);
  },
  "setupReactive -> useReactive(() => $it)": (blueprint) => {
    const instance = setupReactive(({ service }) => service(blueprint));
    return useReactive(() => instance, []);
  },
  "setupReactive -> useReactive(() => $it.current)": (blueprint) => {
    const instance = setupReactive(({ service }) => service(blueprint));
    return useReactive(() => instance.current, []);
  },
};

interface SetupReactiveComponentDefinition {
  current: number;
  increment: () => void;
}

type DefineServiceComponent = (
  test: (useService: ServiceStyle) => SetupReactiveComponentDefinition
) => Promise<void>;

type DefineUseReactiveComponent = (
  test: (useReactive: UseReactiveStyle) => SetupReactiveComponentDefinition
) => Promise<void>;

type DefineSetupReactiveComponent = (
  test: (makeReactive: SetupReactiveStyle) => SetupReactiveComponentDefinition
) => Promise<void>;

/**
 * Sets up a test suite for a reactive component using `setupReactive` to
 * create subscribe to a reactive value.
 *
 * Each test case has three variations, representing the three overloads of
 * `IntoReactiveBlueprint`.
 *
 * - `setupReactive(reactive)`, where `setupReactive` takes a `Reactive<T>` and
 *   subscribes to it.
 * - `setupReactive(() => reactive)`, where `setupReactive` takes a
 *   function returning a `Reactive<T>` and subscribes to it.
 * - `setupReactive(() => reactive.current)`, where `setupReactive` takes a
 *   function that gets the current value of a `Reactive<T>` (effectively
 *   equivalent to a formula).
 */
export function testSetupReactive(
  name: string,
  define: (component: DefineSetupReactiveComponent) => void | Promise<void>
): void {
  describe(name, () => {
    for (const [styleName, makeReactive] of Object.entries(
      SETUP_REACTIVE_CASES
    )) {
      testReact<void, number>(styleName, async (root) =>
        define(async (test) =>
          expectValidReactive(root, () => test(makeReactive))
        )
      );
    }
  });
}

/**
 * Sets up a test suite for a reactive component using `setupReactive` to
 * create subscribe to a reactive value.
 *
 * Each test case has three variations, representing the three overloads of
 * `IntoReactiveBlueprint`.
 *
 * - `setupReactive(reactive)`, where `setupReactive` takes a `Reactive<T>` and
 *   subscribes to it.
 * - `setupReactive(() => reactive)`, where `setupReactive` takes a
 *   function returning a `Reactive<T>` and subscribes to it.
 * - `setupReactive(() => reactive.current)`, where `setupReactive` takes a
 *   function that gets the current value of a `Reactive<T>` (effectively
 *   equivalent to a formula).
 */
export function testUseReactive(
  name: string,
  define: (component: DefineUseReactiveComponent) => void | Promise<void>
): void {
  describe(name, () => {
    for (const [styleName, useReactive] of Object.entries(USE_REACTIVE_CASES)) {
      testReact<void, number>(styleName, async (root) =>
        define(async (test) =>
          expectValidReactive(root, () => test(useReactive))
        )
      );
    }
  });
}

export function testService(
  name: string,
  define: (component: DefineServiceComponent) => void | Promise<void>
): void {
  describe(name, () => {
    for (const [styleName, useService] of Object.entries(SERVICE_CASES)) {
      testReact<void, number>(styleName, async (root) =>
        define(async (test) =>
          expectValidReactive(root, () => test(useService))
        )
      );
    }
  });
}

async function expectValidReactive(
  root: SetupTestRender<void, number>,
  define: () => SetupReactiveComponentDefinition
): Promise<void> {
  const result = await root
    .expectHTML((value) => `<p>${value}</p><button>++</button>`)
    .render((state) => usingStarbeam(App, { state }));

  function App({ state }: { state: RenderState<number> }) {
    const instance = define();

    return useReactive(() => {
      state.value(instance.current);

      return react.fragment(
        html.p(String(instance.current)),
        html.button({ onClick: instance.increment }, "++")
      );
    }, [instance]);
  }

  expect(result.value).toBe(INITIAL_COUNT);

  await result.find("button").fire.click();

  expect(result.value).toBe(INITIAL_COUNT + INCREMENT);
}
