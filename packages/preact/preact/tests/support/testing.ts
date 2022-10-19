import { getByRole, getByText } from "@testing-library/dom";
import * as testing from "@testing-library/preact";
import {
  type Attributes,
  type ComponentChildren,
  type ComponentClass,
  type ComponentType,
  type FunctionComponent,
  type VNode,
  createElement,
  Fragment,
  h,
} from "preact";
import { act } from "preact/test-utils";
import { renderToString } from "preact-render-to-string";
import { expect } from "vitest";

type TestComponentType<P> =
  | ComponentClass<P>
  | (FunctionComponent<P> extends (...args: infer A) => infer R
      ? (...args: A) => R | VNode[]
      : never);

interface RenderExpectations<T> {
  html?: (value: T) => ComponentChildren;
}

export function RenderTest(
  component: TestComponentType<void>,
  props?: Attributes,
  options?: { into?: HTMLElement }
): Render<void, void>;
export function RenderTest<P>(
  component: TestComponentType<P>,
  props: Attributes & P,
  options?: { into?: HTMLElement }
): Render<P, void>;
export function RenderTest<P>(
  component: TestComponentType<P>,
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
      const string = renderToString(h(Fragment, {}, expected));

      expect(this.#container.innerHTML).toBe(string);
    }
  }
}

class Render<
  P,
  T,
  RenderFn = T extends void
    ? () => Promise<RenderResult<P, void>>
    : (value: T) => Promise<RenderResult<P, T>>
> {
  readonly #component: TestComponentType<P>;
  #props: Attributes & P;
  readonly #into: HTMLElement;
  readonly #expect: Expect<T>;

  constructor(
    component: TestComponentType<P>,
    props: Attributes & P,
    into: HTMLElement,
    expect: Expect<T>
  ) {
    this.#component = component;
    this.#props = props;
    this.#into = into;
    this.#expect = expect;
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

  render = (async (value?: T): Promise<RenderResult<P, T>> => {
    const result = await testing.render(
      createElement(this.#component as ComponentType<P>, this.#props),
      {
        container: this.#into as Element,
      }
    );

    if (this.#expect && value) {
      this.#expect.check(value);
    }

    return RenderResult.create<P, T>({
      component: this.#component,
      container: this.#into,
      expect: this.#expect,
      props: this.#props,
      result,
    });
  }) as RenderFn;
}

class RenderResult<P, T> {
  static create<P, T>({
    component,
    container,
    expect,
    next,
    props,
    result,
  }: {
    component: TestComponentType<P>;
    container: HTMLElement;
    expect: Expect<T>;
    props: Attributes & P;
    result: testing.RenderResult;
    next?: { value: T };
  }): RenderResult<P, T> {
    return new RenderResult(component, container, expect, next, props, result);
  }

  readonly #component: TestComponentType<P>;
  readonly #container: HTMLElement;
  readonly #expect: Expect<T>;
  readonly #next: { value: T } | undefined;
  #props: Attributes & P;
  #result: testing.RenderResult;

  constructor(
    component: TestComponentType<P>,
    container: HTMLElement,
    expect: Expect<T>,
    next: { value: T } | undefined,
    props: Attributes & P,
    result: testing.RenderResult
  ) {
    this.#component = component;
    this.#container = container;
    this.#expect = expect;
    this.#next = next;
    this.#props = props;
    this.#result = result;
  }

  async render(props?: P): Promise<RenderResult<P, T>> {
    if (props) {
      this.#props = props;
    }
    this.#result.rerender(
      createElement(this.#component as ComponentType<P>, this.#props)
    );
    return this;
  }

  get element(): TestElement<HTMLElement, T> {
    return TestElement.create(this.#container, this.#expect, this.#next);
  }

  get innerHTML(): string {
    return this.element.innerHTML;
  }

  find(
    role: testing.ByRoleMatcher,
    options?: testing.ByRoleOptions
  ): TestElement<HTMLElement, T> {
    return this.element.find(role, options);
  }

  get fire(): Fire {
    return this.element.fire;
  }

  async unmount(): Promise<void> {
    this.#result.unmount();
  }

  next(value: T): RenderResult<P, T> {
    return RenderResult.create({
      component: this.#component,
      container: this.#container,
      expect: this.#expect,
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
    expect: Expect<T>,
    next: { value: T } | undefined
  ): TestElement<E, T> {
    return new TestElement(element, expect, next);
  }

  readonly #element: E;
  readonly #expect: Expect<T>;
  readonly #next: { value: T } | undefined;

  readonly fire: Fire;

  constructor(element: E, expect: Expect<T>, next: { value: T } | undefined) {
    this.#element = element;
    this.#expect = expect;
    this.#next = next;

    const fire = new Proxy(testing.fireEvent, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop) as unknown;
        if (typeof value === "function") {
          return async (...args: unknown[]) => {
            let result = false;

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

  #bind(method: testing.FireObject[keyof testing.FireObject]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any) => {
      let result = false;

      await act(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        result = method(this.#element, ...args);
      });

      return result;
    };
  }

  find(
    this: TestElement<HTMLElement, T>,
    role: testing.ByRoleMatcher,
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
