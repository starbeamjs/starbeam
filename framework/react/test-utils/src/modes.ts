/* eslint-disable */

import { type Stack, callerStack, entryPoint } from "@starbeam/debug";
import * as testing from "@testing-library/react";
import { getByRole, getByText } from "@testing-library/react";
import {
  createElement,
  StrictMode,
  type FunctionComponent,
  type ReactElement,
} from "react";
import { expect, test, type TestAPI } from "vitest";

import { act } from "./act.js";
import { react } from "./dom.js";

class Mode {
  static strict = new Mode("strict");
  static loose = new Mode("loose");

  #mode: "strict" | "loose";

  constructor(mode: "strict" | "loose") {
    this.#mode = mode;
  }

  match<T>(callbacks: { strict: () => T; loose: () => T }): T {
    return this.#mode === "strict" ? callbacks.strict() : callbacks.loose();
  }

  get mode(): "strict" | "loose" {
    return this.#mode;
  }
}

export class RenderState<T> {
  static getValue<T>(state: RenderState<T>): T {
    if (state.#values.length === 0) {
      throw new Error(
        "Attempted to get last render value, but no value was set"
      );
    }

    const value = state.#values[state.#values.length - 1];
    state.#lastChecked = value;
    return value;
  }

  static getLastChecked<T>(state: RenderState<T>): T | undefined {
    return state.#lastChecked;
  }

  #values: T[] = [];
  #lastChecked: T | undefined;
  #renderCount = 0;

  value(value: T) {
    this.#values.push(value);
  }

  rendered() {
    this.#renderCount++;
  }

  get renderCount(): number {
    return this.#renderCount;
  }
}

class RenderResult<Props, T> {
  static getValue<T>(result: RenderResult<any, T>): T {
    return RenderState.getValue(result.#state);
  }

  static getLastChecked<T>(result: RenderResult<any, T>): T | undefined {
    return RenderState.getLastChecked(result.#state);
  }

  #setup: SetupTestRender<Props, T>;
  #state: RenderState<T>;
  #result: testing.RenderResult;
  #rerender: (props?: Props) => void;

  constructor(
    setup: SetupTestRender<Props, T>,
    state: RenderState<T>,
    result: testing.RenderResult,
    rerender: (props?: Props) => void
  ) {
    this.#setup = setup;
    this.#state = state;
    this.#result = result;
    this.#rerender = rerender;
  }

  get #element(): TestElement<HTMLElement> {
    return TestElement.create(this.#result.container);
  }

  get value(): T {
    return RenderState.getValue(this.#state);
  }

  async rerender(
    props?: Props,
    caller: Stack = callerStack()
  ): Promise<RenderResult<Props, T>> {
    await this.act(() => this.#rerender(props), caller);

    return entryPoint(
      () => {
        SetupTestRender.assert(this.#setup, this);

        return this;
      },
      { stack: caller }
    );
  }

  async act(
    behavior: () => void,
    caller: Stack = callerStack()
  ): Promise<void> {
    const prev = this.#state.renderCount;
    entryPoint(
      () => {
        act(behavior);
      },
      { stack: caller }
    );
    await this.rendered(prev, caller);
  }

  async rendered(prev: number, caller: Stack = callerStack()): Promise<void> {
    await testing.waitFor(() => {
      entryPoint(
        () => {
          expect(
            this.#state.renderCount,
            "expected another render"
          ).toBeGreaterThan(prev);
        },
        { stack: caller }
      );
    });
  }

  async unmount(): Promise<void> {
    this.#result.unmount();
  }

  find(role: testing.ByRoleMatcher, options?: testing.ByRoleOptions) {
    return this.#element.find(role, options);
  }

  findByText(
    id: testing.Matcher,
    options?: testing.SelectorMatcherOptions
  ): TestElement<HTMLElement> {
    return this.#element.findByText(id, options);
  }

  get innerHTML(): string {
    return this.#element.innerHTML;
  }

  get textContent(): string {
    return this.#element.textContent ?? "";
  }

  raw<T>(callback: (element: HTMLElement) => T): T {
    return this.#element.raw(callback);
  }
}

export class SetupTestRender<Props, T> {
  static assert<T>(
    render: SetupTestRender<any, T>,
    result: RenderResult<any, T>
  ): void {
    if (render.#expectHtml) {
      expect(result.innerHTML).toBe(
        render.#expectHtml(RenderResult.getValue(result))
      );
    }

    if (render.#expectStable) {
      const lastChecked = RenderResult.getLastChecked(result);
      const current = RenderResult.getValue(result);

      if (lastChecked === undefined || current === undefined) {
        if (lastChecked !== current) {
          console.error("Expected current value to equal last checked value", {
            lastChecked,
            current,
          });
          throw new Error(
            "Expected stable value to be equal to last checked value"
          );
        }

        return;
      }

      expect(render.#expectStable(current)).toBe(
        render.#expectStable(lastChecked)
      );
    }
  }

  #expectHtml: undefined | ((value: T) => string);
  #expectStable: undefined | ((value: T) => unknown);
  #options: testing.RenderOptions;

  constructor(options: testing.RenderOptions) {
    this.#options = options;
  }

  render(
    this: SetupTestRender<RenderState<void>, T>,
    render: (state: RenderState<T>, props?: void) => ReactElement,
    props?: void
  ): Promise<RenderResult<void, T>>;
  render(
    render: (state: RenderState<T>, props: Props) => ReactElement,
    props: Props
  ): Promise<RenderResult<Props, T>>;
  async render(
    this: SetupTestRender<RenderState<any>, any>,
    render: (state: RenderState<any>, props?: any) => ReactElement,
    props?: any
  ): Promise<RenderResult<any, T>> {
    const result = entryPoint(() => {
      const state = new RenderState<T>();
      let i = 0;

      const Component = (props: any): ReactElement => {
        state.rendered();
        return render(state, props);
      };

      const result = act(() =>
        testing.render(
          react.render(Component, { ...props, rerender: ++i }),
          this.#options
        )
      );

      const renderResult = new RenderResult(
        this,
        state,
        result,
        (updatedProps?: any) => {
          if (updatedProps) {
            result.rerender(
              react.render(Component, { ...updatedProps, rerender: ++i })
            );
          } else {
            result.rerender(
              react.render(Component, { ...props, rerender: ++i })
            );
          }
        }
      );

      return renderResult;
    }) as unknown as RenderResult<Props, T>;

    entryPoint(() => {
      SetupTestRender.assert(this, result);
    });

    return result;
  }

  expectHTML(expectHtml: (value: T) => string): this {
    this.#expectHtml = expectHtml;
    return this;
  }

  expectStable(expectStable: (value: T) => unknown = (value) => value): this {
    this.#expectStable = expectStable;
    return this;
  }
}

type TestModes<Props, T> = (
  mode: Mode,
  render: SetupTestRender<Props, T>
) => void | Promise<void>;

export function testStrictAndLoose<Props, T>(
  name: string,
  modes: TestModes<Props, T>
) {
  testStrictAndLoose.strict(name, modes);
  testStrictAndLoose.loose(name, modes);
}

testStrictAndLoose.skip = <Props, T>(
  name: string,
  modes: TestModes<Props, T>
) => {
  testStrictAndLoose.strict(name, modes, test.skip as TestAPI);
  testStrictAndLoose.loose(name, modes, test.skip as TestAPI);
};

testStrictAndLoose.strict = <Props, T>(
  name: string,
  modes: TestModes<Props, T>,
  testFn: TestAPI = test
): void => {
  testFn(`${name} (strict mode)`, async () => {
    const setup = new SetupTestRender<Props, T>({ wrapper: StrictMode });
    return modes(Mode.strict, setup);
  });
};

testStrictAndLoose.loose = <Props, T>(
  name: string,
  modes: TestModes<Props, T>,
  testFn: TestAPI = test
) => {
  testFn(`${name} (loose mode)`, async () => {
    const setup = new SetupTestRender<Props, T>({});
    return modes(Mode.loose, setup);
  });
};

type BoundFireObject = {
  [P in keyof testing.FireObject]: testing.FireObject[P] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    element: any,
    ...args: infer Args
  ) => infer Return
    ? (...args: Args) => Promise<Return>
    : never;
};

// #region commented1
// import { entryPoint, UNINITIALIZED } from "@starbeam-workspace/test-utils";
// import {
//   type ByRoleMatcher,
//   type ByRoleOptions,
//   type FireObject,
//   type Matcher,
//   type RenderResult as UpstreamRenderResult,
//   type SelectorMatcherOptions,
//   fireEvent,
//   getByRole,
//   getByText,
//   render,
// } from "@testing-library/react";
// import {
//   type FunctionComponent,
//   type ReactElement,
//   createElement,
//   StrictMode,
//   useState,
// } from "react";
// import { expect, test } from "vitest";

// import { TIMELINE } from "../../../../packages/bundle/index.js";
// import { act } from "./react.js";

// // import { UNINITIALIZED } from "../../use-resource/src/utils.js/src/utils.js";
// // import { entryPoint } from "../../use-resource/tests/support/entry-point.jsce/tests/support/entry-point.js";
// // import { act } from "../../use-resource/tests/support/react.jsresource/tests/support/react.js";

// interface RenderResultConfiguration<T> {
//   readonly values: Values<T>;
//   readonly rerender: { readonly current: () => void };
//   readonly count: () => number;
// }

// interface RenderResultOptions<Props, T> extends RenderResultConfiguration<T> {
//   readonly props: Props;
// }

// interface RenderResultState<T> extends RenderResultConfiguration<T> {
//   snapshot: RenderSnapshot;
// }

// interface HtmlTemplate<T> {
//   (value: T): string;
// }

// type BoundFireObject = {
//   [P in keyof FireObject]: FireObject[P] extends (
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     element: any,
//     ...args: infer Args
//   ) => infer Return
//     ? (...args: Args) => Promise<Return>
//     : never;
// };
// #endregion

export class TestElement<E extends Element> {
  static create<E extends Element>(element: E): TestElement<E> {
    return new TestElement(element);
  }

  readonly #element: E;

  readonly fire: {
    [P in keyof testing.FireObject]: testing.FireObject[P] extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: any,
      ...args: infer Args
    ) => infer Return
      ? (...args: Args) => Promise<Return>
      : never;
  };

  constructor(element: E) {
    this.#element = element;

    const fire: Partial<BoundFireObject> = {};

    for (const [key, value] of Object.entries(testing.fireEvent)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      fire[key as keyof BoundFireObject] = this.#bind(value);
    }

    this.fire = fire as BoundFireObject;
  }

  #bind(method: testing.FireObject[keyof testing.FireObject]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = act(() => method(this.#element, ...args));
      return result;
    };
  }

  find(
    this: TestElement<HTMLElement>,
    role: testing.ByRoleMatcher,
    options?: testing.ByRoleOptions
  ): TestElement<HTMLElement> {
    return TestElement.create(getByRole(this.#element, role, options));
  }

  findByText(
    this: TestElement<HTMLElement>,
    id: testing.Matcher,
    options?: testing.SelectorMatcherOptions
  ): TestElement<HTMLElement> {
    return TestElement.create(getByText(this.#element, id, options));
  }

  get innerHTML(): string {
    return this.#element.innerHTML;
  }

  get textContent(): string {
    return this.#element.textContent ?? "";
  }

  raw<T>(callback: (element: E) => T): T {
    return callback(this.#element);
  }
}

export function strictElement<Props extends object>(
  component: FunctionComponent<Props>,
  props?: Props
) {
  return createElement(StrictMode, null, createElement(component, props));
}
