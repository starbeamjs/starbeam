import {
  type ByRoleMatcher,
  type ByRoleOptions,
  type FireObject,
  type RenderResult as UpstreamRenderResult,
  fireEvent,
  getByRole,
  render,
} from "@testing-library/react";
import {
  type FunctionComponent,
  type ReactElement,
  createElement,
  StrictMode,
  useState,
} from "react";
import { expect, test } from "vitest";

import { UNINITIALIZED } from "../src/utils.js";
import { entryPoint } from "./entry.js";
import { act } from "./react.js";

interface RenderResultConfiguration<T> {
  readonly values: Values<T>;
  readonly rerender: { readonly current: () => void };
  readonly count: () => number;
}

interface RenderResultOptions<Props, T> extends RenderResultConfiguration<T> {
  readonly props: Props;
}

interface RenderResultState<T> extends RenderResultConfiguration<T> {
  context: RenderContext<T>;
}

interface HtmlTemplate<T> {
  (value: T): string;
}

type BoundFireObject = {
  [P in keyof FireObject]: FireObject[P] extends (
    element: any,
    ...args: infer Args
  ) => infer Return
    ? (...args: Args) => Return
    : never;
};

export class TestElement<E extends Element> {
  static create<E extends Element>(
    element: E,
    assert: () => void
  ): TestElement<E> {
    return new TestElement(element, assert);
  }

  readonly #element: E;
  readonly #assert: () => void;

  readonly fire: {
    [P in keyof FireObject]: FireObject[P] extends (
      element: any,
      ...args: infer Args
    ) => infer Return
      ? (...args: Args) => Return
      : never;
  };

  constructor(element: E, assert: () => void) {
    this.#element = element;
    this.#assert = assert;

    const fire: Partial<BoundFireObject> = {};

    for (let [key, value] of Object.entries(fireEvent)) {
      fire[key as keyof BoundFireObject] = this.#bind(value);
    }

    this.fire = fire as BoundFireObject;
  }

  #bind(method: FireObject[keyof FireObject]) {
    return (...args: any) => {
      const result = method(this.#element, ...args);
      entryPoint(() => this.#assert());
      return result;
    };
  }

  find(
    this: TestElement<HTMLElement>,
    role: ByRoleMatcher,
    options?: ByRoleOptions
  ) {
    return TestElement.create(
      getByRole(this.#element, role, options),
      this.#assert
    );
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

export class RenderResult<Props, T> {
  static render<Props, T>(
    component: (props: Props) => ReactElement,
    options: RenderResultOptions<Props, T>
  ): RenderResult<Props, T>;
  static render<Props, T>(
    component: () => ReactElement,
    options: RenderResultConfiguration<T>
  ): RenderResult<Props, T>;
  static render<Props, T>(
    component: (props?: Props) => ReactElement,
    options: RenderResultConfiguration<T> & { readonly props?: Props }
  ): RenderResult<Props, T> {
    const result = act(() => render(component(options.props)));
    return new RenderResult(result, component, {
      ...options,
      context: RenderContext.create(result.container),
    });
  }

  readonly #result: UpstreamRenderResult;
  readonly #component: (props: Props) => ReactElement;
  readonly #state: RenderResultState<T>;

  constructor(
    result: UpstreamRenderResult,
    component: (props: Props) => ReactElement,
    state: RenderResultState<T>
  ) {
    this.#result = result;
    this.#component = component;
    this.#state = state;
  }

  /**
   * This test facility helps you automatically verify that values that are
   * expected to be stable across renders actually are stable.
   *
   * If you mark a `RenderResult` as `expectStable`, the `RenderResult` will
   * validate that the value is stable (doesn't change its identity) every time
   * you check it explicitly and every time you re-render.
   */
  expectStableValue(): RenderResult<Props, T> {
    return new RenderResult(this.#result, this.#component, {
      ...this.#state,
      context: this.#state.context.expectStable(this.values.stability()),
    });
  }

  expectStable<U>(value: (value: T) => U): RenderResult<Props, T> {
    return new RenderResult(this.#result, this.#component, {
      ...this.#state,
      context: this.#state.context.expectStableValue(value),
    });
  }

  expectHTML(template: HtmlTemplate<T>): RenderResult<Props, T> {
    return new RenderResult(this.#result, this.#component, {
      ...this.#state,
      context: this.#state.context.expectHTML(template),
    });
  }

  find(role: ByRoleMatcher, options?: ByRoleOptions) {
    return this.container.find(role, options);
  }

  get fire(): BoundFireObject {
    return this.container.fire;
  }

  get values(): Values<T> {
    return this.#state.values;
  }

  get container(): TestElement<HTMLElement> {
    return TestElement.create(this.#result.container, () => this.#assert());
  }

  get element(): Element {
    return this.#result.container;
  }

  get textContent() {
    return this.container.textContent;
  }

  get innerHTML() {
    return this.container.innerHTML;
  }

  get count(): number {
    return this.#state.count();
  }

  get value(): T {
    Values.settle(this.#state.values);
    return this.#state.values.last;
  }

  readonly rerender = (props?: Props): { expecting: RerenderContext<T> } => {
    if (props) {
      this.#result.rerender(this.#component(props));
    } else {
      act(() => {
        this.#state.rerender.current();
      });
    }

    return { expecting: this.#postcondition() };
  };

  deactivate() {}

  unmount(): { expecting: RerenderContext<T> } {
    return entryPoint(() => {
      this.#result.unmount();

      return { expecting: this.#postcondition() };
    });
  }

  #postcondition(): RerenderContext<T> {
    Values.settle(this.#state.values);

    return new RenderResult(this.#result, this.#component, {
      ...this.#state,
      context: this.#state.context.unmounted(),
    }).#assert();
  }

  #assert(): RerenderContext<T> {
    const [prev, next] = [this.#state.context, this.#state.context.next()];
    this.#state.context = next;
    const context = RerenderContext.create(prev, next);

    RerenderContext.assert<T>(context, this);
    return context;
  }
}

interface Snapshot {
  readonly container: Element;
}

function snapshot(container: Element): Snapshot {
  return { container: container.cloneNode(true) as Element };
}

class StableValue<T, U> {
  static create<T, U>(
    value: (value: T) => U,
    expectedStability: STABLE | UNSTABLE
  ): StableValue<T, U> {
    return new StableValue(value, expectedStability, UNINITIALIZED);
  }

  readonly #value: (value: T) => U;
  readonly #expectedStability: STABLE | UNSTABLE;
  #current: U | UNINITIALIZED;

  private constructor(
    value: (value: T) => U,
    expectedStability: STABLE | UNSTABLE,
    last: U | UNINITIALIZED
  ) {
    this.#value = value;
    this.#expectedStability = expectedStability;
    this.#current = last;
  }

  assert(value: T) {
    const stability = this.#check(value);

    if (stability === this.#expectedStability) {
      return;
    } else {
      expect(stability).toBe(this.#expectedStability);
    }
  }

  #check(value: T): STABLE | UNSTABLE {
    const prev = this.#current;
    const next = (this.#current = this.#value(value));

    if (prev === UNINITIALIZED || prev === next) {
      return STABLE;
    } else {
      return UNSTABLE;
    }
  }
}

class RenderContext<T> {
  static create<T>(container: Element): RenderContext<T> {
    return new RenderContext(snapshot(container), container, [], null, null);
  }

  private constructor(
    readonly snapshot: Snapshot,
    readonly container: Element,
    readonly stableValues: StableValue<T, unknown>[],
    readonly stability: Stability | null,
    readonly html: HtmlTemplate<T> | null
  ) {}

  expectStable(stability: Stability): RenderContext<T> {
    return new RenderContext(
      this.snapshot,
      this.container,
      this.stableValues,
      stability,
      this.html
    );
  }

  expectStableValue<U>(value: (value: T) => U): RenderContext<T> {
    return new RenderContext(
      this.snapshot,
      this.container,
      [...this.stableValues, StableValue.create(value, STABLE)],
      this.stability,
      this.html
    );
  }

  unmounted(): RenderContext<T> {
    return new RenderContext(
      this.snapshot,
      this.container,
      this.stableValues,
      this.stability,
      null
    );
  }

  expectHTML(template: HtmlTemplate<T>): RenderContext<T> {
    return new RenderContext(
      this.snapshot,
      this.container,
      this.stableValues,
      this.stability,
      template
    );
  }

  next(): RenderContext<T> {
    return new RenderContext(
      snapshot(this.container),
      this.container,
      this.stableValues,
      this.stability,
      this.html
    );
  }
}

class RerenderContext<T> {
  static create<T>(
    previous: RenderContext<T>,
    current: RenderContext<T>
  ): RerenderContext<T> {
    return new RerenderContext(previous, current);
  }

  static assert<T>(
    context: RerenderContext<T>,
    result: RenderResult<any, T>
  ): RerenderContext<T> {
    if (context.#current.stability) {
      context.#current.stability.check();
    }

    if (context.#current.html) {
      const expectedHTML = context.#current.html(result.value);
      context.html(expectedHTML);
    }

    for (let value of context.#current.stableValues) {
      value.assert(result.value);
    }

    return context;
  }

  readonly #last: RenderContext<T>;
  readonly #current: RenderContext<T>;

  constructor(last: RenderContext<T>, current: RenderContext<T>) {
    this.#last = last;
    this.#current = current;
  }

  html(expected: string): this {
    entryPoint(() => {
      expect(this.#current.container.innerHTML).toBe(expected);
    });

    return this;
  }

  stableHTML(): this {
    entryPoint(() => {
      this.html(this.#last.container.innerHTML);
    });

    return this;
  }
}

export const STABLE = "the value\nwas stable\nsince the last time you checked";
export type STABLE = typeof STABLE;
export const UNSTABLE = "the value\nchanged\nsince the last time you checked";
export type UNSTABLE = typeof UNSTABLE;

interface Stability {
  check: (this: void) => STABLE | UNSTABLE;
}

class Values<T> {
  static create<T>(): Values<T> {
    return new Values([], []);
  }

  static push<T>(values: Values<T>, value: T): void {
    values.#values.push(value);
  }

  static settle<T>(values: Values<T>) {
    if (values.#values.length === 0) {
      throw Error(
        `The values array is unexpectedly empty (even though we expect that rendering has occurred)`
      );
    }

    values.#settled.push(values.last);
  }

  #values: T[];
  #settled: T[];

  constructor(values: T[], settled: T[]) {
    this.#values = values;
    this.#settled = settled;
  }

  stability(): Stability {
    const initial = this.last;

    return {
      check: () => (initial === this.last ? STABLE : UNSTABLE),
    };
  }

  get all(): readonly T[] {
    return [...this.#settled];
  }

  get unique(): Set<T> {
    return new Set(this.#settled);
  }

  get last(): T {
    if (this.#values.length === 0) {
      throw Error(
        `The values array is unexpectedly empty (even though we expect that rendering has occurred)`
      );
    }

    return this.#values[this.#values.length - 1];
  }
}

export class Mode {
  constructor(readonly mode: "strict" | "loose") {}

  match<T>(matcher: { strict: () => T; loose: () => T }): T {
    return matcher[this.mode]();
  }

  // render(component: FunctionComponent): RenderResult {
  //   return RenderResult.render(() => this.root(component));
  // }

  render<T, Props extends object>(
    definition: (props: Props) => { dom: ReactElement; value: T },
    props: Props
  ): RenderResult<Props, T>;
  render<T>(
    definition: () => { dom: ReactElement; value: T }
  ): RenderResult<void, T>;
  render<T, Props extends object>(
    definition: (props?: Props) => { dom: ReactElement; value: T },
    props?: Props
  ): RenderResult<Props, T> {
    let rerender: { current: () => void } = { current: () => null };
    let renderCount = 0;
    const values: Values<T> = Values.create();

    function Component(props?: Props): ReactElement {
      const [, setNotify] = useState({});
      rerender.current = () => setNotify({});
      renderCount++;

      const { dom, value: returnValue } = definition(props);
      Values.push(values, returnValue);
      return dom;
    }

    const result = RenderResult.render(
      (props) => this.#root(Component, props),
      {
        props,
        values,
        rerender,
        count: () => renderCount,
      }
    );

    Values.settle(values);

    return result;
  }

  #root<Props extends object>(
    component: FunctionComponent<Props>,
    props?: Props
  ): ReactElement {
    switch (this.mode) {
      case "loose":
        return createElement(component, props);
      case "strict":
        return strictElement(component);
    }
  }
}

export function testModes(
  description: string,
  callback: (mode: Mode) => void | Promise<void>
): void {
  test(`loose mode: ${description}`, async () => {
    await callback(new Mode("loose"));
  });
  test(`strict mode: ${description}`, async () => {
    await callback(new Mode("strict"));
  });
}

export function strictElement<Props extends object>(
  component: FunctionComponent<Props>,
  props?: Props
) {
  return createElement(StrictMode, null, createElement(component, props));
}
