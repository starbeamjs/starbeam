/* eslint-disable @typescript-eslint/no-explicit-any */

import { getLast, isPresentArray } from "@starbeam/core-utils";
import {
  describe,
  expect,
  test,
  type TestAPI,
} from "@starbeam-workspace/test-utils";
import * as testing from "@testing-library/react";
import { getByRole, getByText } from "@testing-library/react";
import { type ReactElement, StrictMode } from "react";

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

const INITIAL_RENDER_COUNT = 0;

export class RenderState<T> {
  static getValue<T>(state: RenderState<T>): T {
    if (isPresentArray(state.#values)) {
      const value = getLast(state.#values);
      state.#lastChecked = value;
      return value;
    } else {
      throw new Error(
        "Attempted to get last render value, but no value was set"
      );
    }
  }

  static getLastChecked<T>(state: RenderState<T>): T | undefined {
    return state.#lastChecked;
  }

  #values: T[] = [];
  #lastChecked: T | undefined;
  #renderCount = INITIAL_RENDER_COUNT;

  readonly value = (value: T): void => {
    this.#values.push(value);
  };

  readonly update = (callback: (value: T) => T): void => {
    if (isPresentArray(this.#values)) {
      const lastValue = getLast(this.#values);
      const newValue = callback(lastValue);
      this.#values.push(newValue);
    } else {
      throw new Error(
        "Attempted to update last render value, but no value was set"
      );
    }
  };

  readonly rendered = (): void => {
    this.#renderCount++;
  };

  get renderCount(): number {
    return this.#renderCount;
  }
}

export class RenderResult<Props, T> {
  static getValue<T>(result: RenderResult<any, T>): T {
    return RenderState.getValue(result.#state);
  }

  static getLastChecked<T>(result: RenderResult<any, T>): T | undefined {
    return RenderState.getLastChecked(result.#state);
  }

  #setup: SetupTestRoot<Props, T>;
  #state: RenderState<T>;
  #result: testing.RenderResult;
  #props: Props;
  #rerender: (props?: Props) => void;

  constructor(
    setup: SetupTestRoot<Props, T>,
    state: RenderState<T>,
    result: testing.RenderResult,
    props: Props,
    rerender: (props?: Props) => void
  ) {
    this.#setup = setup;
    this.#state = state;
    this.#result = result;
    this.#props = props;
    this.#rerender = rerender;
  }

  get #element(): TestElement<HTMLElement> {
    return TestElement.create(this.#result.container);
  }

  get value(): T {
    return RenderState.getValue(this.#state);
  }

  async rerender(props?: Props): Promise<RenderResult<Props, T>> {
    await this.act(() => {
      this.#rerender(props);
    });

    const newProps = props ?? this.#props;

    this.#props = newProps;

    SetupTestRoot.assert(this.#setup, this, newProps);

    return this;
  }

  async act(behavior: () => void): Promise<void> {
    const prev = this.#state.renderCount;
    act(() => {
      behavior();
    });
    await this.rendered(prev);
  }

  async rendered(prev: number): Promise<void> {
    await testing.waitFor(() => {
      () => {
        expect(
          this.#state.renderCount,
          "expected another render"
        ).toBeGreaterThan(prev);
      };
    });
  }

  unmount(): void {
    this.#result.unmount();
  }

  find(
    role: testing.ByRoleMatcher,
    options?: testing.ByRoleOptions
  ): TestElement<HTMLElement> {
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
    return this.#element.textContent;
  }

  raw<T>(callback: (element: HTMLElement) => T): T {
    return this.#element.raw(callback);
  }
}

export class SetupTestRoot<Props, T> {
  static assert<Props, T>(
    render: SetupTestRoot<Props, T>,
    result: RenderResult<Props, T>,
    props: Props
  ): void {
    if (render.#expectHtml) {
      expect(result.innerHTML).toBe(
        render.#expectHtml(RenderResult.getValue(result), props)
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

  #expectHtml: undefined | ((value: T, props: Props) => string);
  #expectStable: undefined | ((value: T) => unknown);
  #options: testing.RenderOptions;

  constructor(options: testing.RenderOptions) {
    this.#options = options;
  }

  render(
    this: SetupTestRoot<RenderState<void>, T>,
    render: (state: RenderState<T>, props?: void) => ReactElement,
    props?: void
  ): RenderResult<void, T>;
  render(
    render: (state: RenderState<T>, props: Props) => ReactElement,
    props: Props
  ): RenderResult<Props, T>;
  render(
    this: SetupTestRoot<RenderState<any>, any>,
    render: (state: RenderState<any>, props?: any) => ReactElement,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    props?: any
  ): RenderResult<any, T> {
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
      props,
      (updatedProps?: any) => {
        if (updatedProps) {
          result.rerender(
            react.render(Component, { ...updatedProps, rerender: ++i })
          );
        } else {
          result.rerender(react.render(Component, { ...props, rerender: ++i }));
        }
      }
    );

    SetupTestRoot.assert(
      this as unknown as SetupTestRoot<Props, T>,
      renderResult,
      props as Props
    );

    return renderResult as RenderResult<Props, T>;
  }

  expectHTML(expectHtml: (value: T, props: Props) => string): this {
    if (this.#expectStable === undefined) this.#expectStable = (value) => value;
    this.#expectHtml = expectHtml;
    return this;
  }

  expectStable(expectStable: (value: T) => unknown = (value) => value): this {
    this.#expectStable = expectStable;
    return this;
  }
}

type TestModes<Props, T> = (
  root: SetupTestRoot<Props, T>,
  mode: Mode
) => void | Promise<void>;

export function testReact<Props, T>(
  name: string,
  modes: TestModes<Props, T>
): void {
  describe(name, () => {
    testReact.strict(modes);
    testReact.loose(modes);
  });
}

testReact.skip = <Props, T>(name: string, modes: TestModes<Props, T>) => {
  describe.skip(name, () => {
    testReact.strict(modes);
    testReact.loose(modes);
  });
};

testReact.strict = <Props, T>(
  modes: TestModes<Props, T>,
  testFn: TestAPI = test
) => {
  testFn(`strict mode`, async () => {
    try {
      const setup = new SetupTestRoot<Props, T>({ wrapper: StrictMode });
      await modes(setup, Mode.strict);
    } finally {
      testing.cleanup();
    }
  });
};

testReact.loose = <Props, T>(
  modes: TestModes<Props, T>,
  testFn: TestAPI = test
) => {
  testFn(`loose mode`, async () => {
    try {
      const setup = new SetupTestRoot<Props, T>({});
      await modes(setup, Mode.loose);
    } finally {
      testing.cleanup();
    }
  });
};

type BoundFireObject = {
  [P in keyof testing.FireObject]: testing.FireObject[P] extends (
    element: any,
    ...args: infer Args
  ) => infer Return
    ? (...args: Args) => Promise<Return>
    : never;
};

export class TestElement<E extends Element> {
  static create<E extends Element>(element: E): TestElement<E> {
    return new TestElement(element);
  }

  readonly #element: E;

  readonly fire: {
    [P in keyof testing.FireObject]: testing.FireObject[P] extends (
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
    return async (...args: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = act(() => method(this.#element, ...args));
      return Promise.resolve(result);
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
