import { type ByRoleMatcher, getByRole, getByText } from "@testing-library/dom";
import * as testing from "@testing-library/preact";
import {
  type Attributes,
  type ComponentChildren,
  createElement,
  Fragment,
  h,
  type VNode,
} from "preact";
import { act } from "preact/test-utils";
import { renderToString } from "preact-render-to-string";
import { expect } from "vitest";

export type Component<Props = void> = import("preact").ComponentType<Props>;

interface RenderExpectations<T> {
  html?: (value: T) => ComponentChildren;
}

export function RenderTest(
  component: Component,
  props?: Attributes,
  options?: { into?: HTMLElement }
): Render<void, void>;
export function RenderTest<P>(
  component: Component<P>,
  props: Attributes & P,
  options?: { into?: HTMLElement }
): Render<P, void>;
export function RenderTest<P>(
  component: Component<P>,
  props: Attributes & P,
  { into = document.createElement("div") }: { into?: HTMLElement } = {}
): Render<P, void> {
  return new Render(component, props, into, Expect.from(into));
}

class Expect<T> {
  static from<T>(container: HTMLElement): Expect<T> {
    return new Expect(container, undefined);
  }

  readonly #container: HTMLElement;
  readonly #expectations: RenderExpectations<T> | undefined;

  constructor(
    container: HTMLElement,
    expectations: RenderExpectations<T> | undefined
  ) {
    this.#container = container;
    this.#expectations = expectations;
  }

  check(value: T): void {
    if (this.#expectations && this.#expectations.html) {
      const expected = this.#expectations.html(value);
      const string = renderToString(
        h(Fragment, {}, expected) as VNode<unknown>
      );

      expect(this.#container.innerHTML).toBe(string);
    }
  }
}

class Render<P, T> {
  readonly #component: Component<P>;
  #props: Attributes & P;
  readonly #into: HTMLElement;
  readonly #expect: Expect<T>;

  constructor(
    component: Component<P>,
    props: Attributes & P,
    into: HTMLElement,
    expectation: Expect<T>
  ) {
    this.#component = component;
    this.#props = props;
    this.#into = into;
    this.#expect = expectation;
  }

  render(value?: T): RenderResult<P, T> {
    const result = testing.render(createElement(this.#component, this.#props), {
      container: this.#into as Element,
    });

    if (value) {
      this.#expect.check(value);
    }

    return RenderResult.create<P, T>({
      component: this.#component,
      container: this.#into,
      expectation: this.#expect,
      props: this.#props,
      result,
    });
  }

  html(this: Render<P, void>, check: () => ComponentChildren): Render<P, void>;
  html<U>(
    this: Render<P, void>,
    check: (value: U) => ComponentChildren
  ): Render<P, U>;
  html<U extends T>(
    this: Render<P, void>,
    check: (value: U) => ComponentChildren
  ): Render<P, U>;
  html<U>(check: (value: U) => ComponentChildren): Render<P, U> {
    return new Render(
      this.#component,
      this.#props,
      this.#into,
      new Expect(this.#into, {
        ...this.#expect,
        html: check,
      })
    );
  }
}

class RenderResult<P, T> {
  static create<P, T>({
    component,
    container,
    expectation,
    next,
    props,
    result,
  }: {
    component: Component<P>;
    container: HTMLElement;
    expectation: Expect<T>;
    props: Attributes & P;
    result: testing.RenderResult;
    next?: { value: T };
  }): RenderResult<P, T> {
    return new RenderResult(
      component,
      container,
      expectation,
      next,
      props,
      result
    );
  }

  readonly #component: Component<P>;
  readonly #container: HTMLElement;
  readonly #expect: Expect<T>;
  readonly #next: { value: T } | undefined;
  #props: Attributes & P;
  #result: testing.RenderResult;

  constructor(
    component: Component<P>,
    container: HTMLElement,
    expectation: Expect<T>,
    next: { value: T } | undefined,
    props: Attributes & P,
    result: testing.RenderResult
  ) {
    this.#component = component;
    this.#container = container;
    this.#expect = expectation;
    this.#next = next;
    this.#props = props;
    this.#result = result;
  }

  get element(): TestElement<HTMLElement, T> {
    return TestElement.create(this.#container, this.#expect, this.#next);
  }

  get innerHTML(): string {
    return this.element.innerHTML;
  }

  get fire(): Fire {
    return this.element.fire;
  }

  render(props?: P): this {
    if (props) {
      this.#props = props;
    }
    this.#result.rerender(createElement(this.#component, this.#props));
    return this;
  }

  find(
    role: ByRoleMatcher,
    options?: testing.ByRoleOptions
  ): TestElement<HTMLElement, T> {
    return this.element.find(role, options);
  }

  unmount(): void {
    this.#result.unmount();
  }

  next(value: T): RenderResult<P, T> {
    return RenderResult.create({
      component: this.#component,
      container: this.#container,
      expectation: this.#expect,
      props: this.#props,
      result: this.#result,
      next: { value },
    });
  }
}

type Fire = {
  [P in keyof testing.FireObject]: testing.FireObject[P] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    element: any,
    ...args: infer Args
  ) => infer Return
    ? (...args: Args) => Promise<Return>
    : never;
};

export class TestElement<E extends Element, T> {
  static create<E extends Element, T>(
    element: E,
    expectation: Expect<T>,
    next: { value: T } | undefined
  ): TestElement<E, T> {
    return new TestElement(element, expectation, next);
  }

  readonly #element: E;
  readonly #expect: Expect<T>;
  readonly #next: { value: T } | undefined;

  readonly fire: Fire;

  constructor(
    element: E,
    expectation: Expect<T>,
    next: { value: T } | undefined
  ) {
    this.#element = element;
    this.#expect = expectation;
    this.#next = next;

    const fire = new Proxy(testing.fireEvent, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop) as unknown;
        if (typeof value === "function") {
          return async (...args: unknown[]) => {
            let result: unknown = false;

            await act(() => {
              result = value(this.#element, ...args);
            });

            if (this.#next) {
              this.#expect.check(this.#next.value);
            }

            return result;
          };
        }
        return value;
      },
    });

    this.fire = fire as unknown as Fire;
  }

  get innerHTML(): string {
    return this.#element.innerHTML;
  }

  get textContent(): string {
    return this.#element.textContent ?? "";
  }

  find(
    this: TestElement<HTMLElement, T>,
    role: ByRoleMatcher,
    options?: testing.ByRoleOptions
  ): TestElement<HTMLElement, T> {
    return TestElement.create(
      getByRole(this.#element, role, options),
      this.#expect,
      this.#next
    );
  }

  findByText(
    this: TestElement<HTMLElement, T>,
    id: testing.Matcher,
    options?: testing.SelectorMatcherOptions
  ): TestElement<HTMLElement, T> {
    return TestElement.create(
      getByText(this.#element, id, options),
      this.#expect,
      this.#next
    );
  }

  raw<U>(callback: (element: E) => U): U {
    return callback(this.#element);
  }
}
