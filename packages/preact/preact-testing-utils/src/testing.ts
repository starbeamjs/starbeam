import * as testing from "@testing-library/preact";
import { test, expect } from "vitest";
import { getByRole, getByText } from "@testing-library/dom";
import {
  createElement,
  Fragment,
  h,
  type Attributes,
  type ComponentChildren,
  type ComponentClass,
  type ComponentType,
  type FunctionComponent,
  type VNode,
} from "preact";
import { act } from "preact/test-utils";
import { renderToString } from "preact-render-to-string";
import htm from "htm";

export const html = htm.bind(h);

type TestComponentType<P> =
  | ComponentClass<P>
  | (FunctionComponent<P> extends (...args: infer A) => infer R
      ? (...args: A) => R | VNode[]
      : never);

interface RenderExpectations<T> {
  html?: (value: T) => ComponentChildren;
}

export const rendering = {
  test: <
    P,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    C extends (render: Render<P, P>) => Render<P, any> | Promise<Render<P, any>>
  >(
    name: string,
    component: TestComponentType<P>,
    callback: C
  ): void => {
    test(name, async () => {
      const into = document.createElement("div");

      if (typeof component === "function" && !component.name) {
        Object.defineProperty(component, "name", {
          configurable: true,
          value: "TestApp",
        });
      }

      const render = Render.create<P, P>(component, into, Expect.from(into));
      const built = await callback(render);
      return built.start();
    });
  },
};

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

interface RenderStep<T> {
  readonly props: T;
}

interface CustomStep<P, T> {
  readonly before?: (prev: RenderResult<P, T>) => Promise<unknown> | void;
  readonly after?: () => Promise<unknown> | void;
}

interface UpdateStep<P, T> extends CustomStep<P, T> {
  readonly props: T;
}

type UnmountStep<P, T> = CustomStep<P, T>;

class Render<P, T extends P> {
  static create<P, T extends P>(
    component: TestComponentType<P>,
    into: HTMLElement,
    expect: Expect<T>
  ): Render<P, T> {
    return new Render(component, into, expect, undefined, [], undefined);
  }

  readonly #component: TestComponentType<P>;
  readonly #into: HTMLElement;
  readonly #expect: Expect<T>;
  readonly #render: RenderStep<T> | undefined;
  readonly #update: UpdateStep<P, T>[];
  readonly #unmount: UnmountStep<P, T> | undefined;

  private constructor(
    component: TestComponentType<P>,
    into: HTMLElement,
    expect: Expect<T>,
    render: RenderStep<T> | undefined,
    update: UpdateStep<P, T>[],
    unmount: UnmountStep<P, T> | undefined
  ) {
    this.#component = component;
    this.#into = into;
    this.#expect = expect;
    this.#render = render;
    this.#update = update;
    this.#unmount = unmount;
  }

  html(
    this: Render<P, P>,
    check: (value: P) => ComponentChildren
  ): Render<P, P>;
  html<U extends T>(
    this: Render<P, P>,
    check: (value: U) => ComponentChildren
  ): Render<P, U>;
  html<U extends T>(
    this: Render<P, U>,
    check: (value: U) => ComponentChildren
  ): Render<P, U>;
  html<U extends T>(check: (value: U) => ComponentChildren): Render<P, U> {
    return new Render(
      this.#component,
      this.#into,
      new Expect(this.#into, {
        ...this.#expect,
        html: check,
      }),
      this.#render as RenderStep<U>,
      this.#update as unknown as UpdateStep<P, U>[],
      this.#unmount as UnmountStep<P, U>
    );
  }

  render(props: T): Render<P, T> {
    return new Render(
      this.#component,
      this.#into,
      this.#expect,
      { props },
      this.#update,
      this.#unmount
    );
  }

  update(props: T, custom?: CustomStep<P, T>): Render<P, T> {
    return new Render(
      this.#component,
      this.#into,
      this.#expect,
      this.#render,
      [...this.#update, { props, ...custom }],
      this.#unmount
    );
  }

  unmount(options: UnmountStep<P, T>): Render<P, T> {
    return new Render(
      this.#component,
      this.#into,
      this.#expect,
      this.#render,
      this.#update,
      options
    );
  }

  async start(): Promise<void> {
    if (!document.contains(this.#into)) {
      document.body.appendChild(this.#into);
    }

    const props = this.#render?.props as T;

    const result = await testing.render(
      createElement(
        this.#component as ComponentType<P>,
        props as Attributes & P
      ),
      {
        container: this.#into as Element,
      }
    );

    if (this.#expect) {
      this.#expect.check(props);
    }

    const renderResult = RenderResult.create<P, T>({
      component: this.#component,
      container: this.#into,
      expect: this.#expect,
      props: props as Attributes & P,
      result,
    });

    for (const update of this.#update) {
      if (update.before) {
        await update.before(renderResult);
      }
      await renderResult.render(update.props);
      if (update.after) {
        await update.after();
      }
    }

    if (this.#unmount) {
      if (this.#unmount.before) {
        await this.#unmount.before(renderResult);
      }

      await renderResult.unmount();

      if (this.#unmount.after) {
        await this.#unmount.after();
      }
    }
  }

  renderOld = async (props: T): Promise<RenderResult<P, T>> => {
    if (!document.contains(this.#into)) {
      document.body.appendChild(this.#into);
    }

    const result = await testing.render(
      createElement(
        this.#component as ComponentType<P>,
        props as Attributes & P
      ),
      {
        container: this.#into as Element,
      }
    );

    if (this.#expect) {
      this.#expect.check(props);
    }

    return RenderResult.create<P, T>({
      component: this.#component,
      container: this.#into,
      expect: this.#expect,
      props: props as Attributes & P,
      result,
    });
  };
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
    next?: T;
  }): RenderResult<P, T> {
    return new RenderResult(component, container, expect, next, props, result);
  }

  readonly #component: TestComponentType<P>;
  readonly #container: HTMLElement;
  readonly #expect: Expect<T>;
  readonly #next: T | undefined;
  #props: Attributes & P;
  #result: testing.RenderResult;

  constructor(
    component: TestComponentType<P>,
    container: HTMLElement,
    expect: Expect<T>,
    next: T | undefined,
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

    if (this.#next) {
      this.#expect.check(this.#next);
    }
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
      next: value,
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
    next: T | undefined
  ): TestElement<E, T> {
    return new TestElement(element, expect, next);
  }

  readonly #element: E;
  readonly #expect: Expect<T>;
  readonly #next: T | undefined;

  readonly fire: Fire;

  constructor(element: E, expect: Expect<T>, next: T | undefined) {
    this.#element = element;
    this.#expect = expect;
    this.#next = next;

    const fire = new Proxy(testing.fireEvent, {
      has: (target, prop) => {
        return prop in target;
      },
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver) as unknown;
        if (typeof prop === "symbol") {
          return value;
        }

        if (typeof value === "function") {
          return async (init?: object) => {
            let result = false;
            await act(() => {
              result = value(this.#element, init);
            });

            if (this.#next) {
              this.#expect.check(this.#next);
            }

            return result;
          };
        }

        return value;
      },
    });

    this.fire = fire as unknown as Fire;
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
