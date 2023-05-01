import { getFirst, isPresent, isPresentArray } from "@starbeam/core-utils";
import { expected, verified } from "@starbeam/verify";
import { expect, test } from "@starbeam-workspace/test-utils";
import { type ByRoleMatcher, fireEvent } from "@testing-library/dom";
import { getByRole, getByText } from "@testing-library/dom";
import * as testing from "@testing-library/preact";
import htm from "htm";
import {
  type Attributes,
  type ComponentChildren,
  type ComponentType,
  createElement,
  Fragment,
  h,
  type VNode,
} from "preact";
import { act } from "preact/test-utils";
import { renderToString } from "preact-render-to-string";

export type Component<Props = void> = import("preact").ComponentType<Props>;

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): VNode {
  const root = boundHTML(strings, ...values);
  return Array.isArray(root) ? createElement(Fragment, null, root) : root;
}

const boundHTML = htm.bind(h) as (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => VNode<unknown> | VNode<unknown>[];

export type HtmlNode = ReturnType<typeof html>;

interface RenderExpectations<T extends RenderProps> {
  html?: (...value: T) => ComponentChildren;
}

function renderTest(
  name: string,
  component: Component,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (render: Root<[], any>) => Root<any> | Promise<Root<any>>
): void;
function renderTest<Props>(
  name: string,
  component: Component<Props>,
  callback: (
    render: Root<[Props], [Props]>
  ) => Root<[Props]> | Promise<Root<[Props]>>
): void;
function renderTest(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (render: Root<any>) => Root<any> | Promise<Root<any>>
): void {
  test(name, async () => {
    const into = document.createElement("div");

    if (typeof component === "function" && !component.name) {
      Object.defineProperty(component, "name", {
        configurable: true,
        value: "TestApp",
      });
    }

    const render: Root<[unknown?]> = Render.create(
      component,
      into,
      Expect.from(into)
    );
    const built = await callback(render);
    return built.start();
  });
}

export const rendering = {
  test: renderTest,
};

class Expect<T extends RenderProps> {
  readonly #container: HTMLElement;
  readonly #expectations: RenderExpectations<T> | undefined;

  static from<T extends RenderProps>(container: HTMLElement): Expect<T> {
    return new Expect(container, undefined);
  }

  constructor(
    container: HTMLElement,
    expectations: RenderExpectations<T> | undefined
  ) {
    this.#container = container;
    this.#expectations = expectations;
  }

  check(args: T): void {
    if (this.#expectations?.html) {
      const expected = this.#expectations.html(...args);

      const string = renderToString(
        h(Fragment, {}, expected) as VNode<unknown>
      );

      expect(this.#container.innerHTML).toBe(string);
    }
  }
}

interface RenderStep<T extends RenderProps> {
  readonly args: T;
}

interface CustomStep<Args extends RenderProps, T extends Args> {
  readonly before?: (prev: RenderResult<Args, T>) => Promise<unknown> | void;
  readonly after?: () => Promise<unknown> | void;
}

interface UpdateStep<Args extends RenderProps, T extends Args>
  extends CustomStep<Args, T> {
  readonly Args: T;
}

type UnmountStep<Args extends RenderProps, T extends Args> = CustomStep<
  Args,
  T
>;

type RenderProps = [unknown?];

export type Root<Props extends RenderProps, T extends Props = Props> = Render<
  Props,
  T
>;

export function Root<R extends Root<T, T>, T extends RenderProps, U extends T>(
  test: (root: R) => Root<T, U>
): (root: R) => Render<T, U> {
  return test;
}

export function render(app: ComponentType<void>): RenderingResult {
  const container = document.createElement("div");
  const component = createElement(app, null);
  return new RenderingResult(
    testing.render(component, { container }),
    container
  );
}

class RenderingResult {
  readonly #result: testing.RenderResult;
  readonly #container: HTMLElement;

  constructor(result: testing.RenderResult, container: HTMLElement) {
    this.#result = result;
    this.#container = container;
  }

  get innerHTML(): string {
    return this.#container.innerHTML;
  }

  find(matcher: testing.ByRoleMatcher): FoundElement {
    return new FoundElement(
      testing.findByRole(this.#result.container as HTMLElement, matcher)
    );
  }
}

class FoundElement {
  readonly #element: Promise<HTMLElement>;

  constructor(element: Promise<HTMLElement>) {
    this.#element = element;
  }

  async click() {
    fireEvent.click(await this.#element);
  }
}

class Render<Args extends RenderProps, T extends Args> {
  readonly #component: Component<T[0]>;
  readonly #expect: Expect<T>;
  readonly #into: HTMLElement;
  readonly #render: RenderStep<T> | undefined;
  readonly #unmount: UnmountStep<Args, T> | undefined;
  readonly #update: UpdateStep<Args, T>[];

  static create<Args extends RenderProps, T extends Args>(
    component: Component<Args[0]>,
    into: HTMLElement,
    expectation: Expect<T>
  ): Render<Args, T> {
    return new Render(component, into, expectation, undefined, [], undefined);
  }

  private constructor(
    component: Component<Args[0]>,
    into: HTMLElement,
    expectation: Expect<T>,
    render: RenderStep<T> | undefined,
    update: UpdateStep<Args, T>[],
    unmount: UnmountStep<Args, T> | undefined
  ) {
    this.#component = component;
    this.#into = into;
    this.#expect = expectation;
    this.#render = render;
    this.#update = update;
    this.#unmount = unmount;
  }

  expect<U extends T>(
    check: (...args: U) => ComponentChildren
  ): Render<Args, U>;
  expect(check: (...args: T) => ComponentChildren): Render<Args, T>;

  expect(check: (...args: T) => ComponentChildren): Render<Args, T> {
    return new Render<Args, T>(
      this.#component,
      this.#into,
      new Expect<Args>(this.#into, {
        ...this.#expect,
        html: check as (...args: Args) => ComponentChildren,
      }),
      this.#render,
      this.#update,
      this.#unmount
    );
  }

  render(...args: T): Render<Args, T> {
    return new Render(
      this.#component,
      this.#into,
      this.#expect,
      { args: args },
      this.#update,
      this.#unmount
    );
  }

  update(...args: [...args: T, custom?: CustomStep<Args, T>]): Render<Args, T> {
    const normalize = (): { Args: T; custom?: CustomStep<Args, T> } => {
      const [propsOrCustom, custom] = args;

      const render = verified(
        this.#render,
        isPresent,
        expected
          .when(`calling update() in a render test`)
          .as(`the render method`)
          .toHave(`already been called`)
      );

      if (propsOrCustom && custom) {
        return { Args: [propsOrCustom] as unknown as T, custom };
      } else if (custom === undefined) {
        return isPresentArray(render.args)
          ? { Args: [propsOrCustom] as unknown as T }
          : {
              Args: [] as unknown as T,
              custom: propsOrCustom as CustomStep<Args, T>,
            };
      } else {
        return { Args: [] as unknown as T };
      }
    };

    return new Render<Args, T>(
      this.#component,
      this.#into,
      this.#expect,
      this.#render,
      [...this.#update, normalize()],
      this.#unmount
    );
  }

  unmount(options: UnmountStep<Args, T>): Render<Args, T> {
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

    const render = this.#render;

    if (render === undefined) {
      throw Error(
        `render() must be called before in the callback to rendering.test()`
      );
    }

    const args = render.args;
    const props = getFirst(render.args);

    const result = testing.render(
      createElement(this.#component as ComponentType, props as Attributes),
      {
        container: this.#into as Element,
      }
    );

    this.#expect.check(args);

    const renderResult = RenderResult.create<Args, T>({
      // FIXME
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      component: this.#component as any,
      container: this.#into,
      expectation: this.#expect,
      args,
      result,
    });

    for (const update of this.#update) {
      if (update.before) {
        await update.before(renderResult);
      }
      await renderResult.render(...update.Args);
      this.#expect.check(update.Args);

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
}

class RenderResult<Args extends RenderProps, T extends Args> {
  static create<Args extends RenderProps, T extends Args>({
    component,
    container,
    expectation,
    next,
    args,
    result,
  }: {
    component: Component;
    container: HTMLElement;
    expectation: Expect<T>;
    args: T;
    result: testing.RenderResult;
    next?: T;
  }): RenderResult<Args, T> {
    return new RenderResult(
      component,
      container,
      expectation,
      next,
      args,
      result
    );
  }

  readonly #component: Component;
  readonly #container: HTMLElement;
  readonly #expect: Expect<T>;
  readonly #next: T | undefined;
  #args: T;
  #result: testing.RenderResult;

  constructor(
    component: Component,
    container: HTMLElement,
    expectation: Expect<T>,
    next: T | undefined,
    args: T,
    result: testing.RenderResult
  ) {
    this.#component = component;
    this.#container = container;
    this.#expect = expectation;
    this.#next = next;
    this.#args = args;
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

  async render(...args: T): Promise<RenderResult<Args, T>> {
    if (isPresentArray(args)) {
      this.#args = args;
    }
    const props = getFirst(this.#args);

    this.#result.rerender(
      createElement(
        this.#component as ComponentType<Args[0]>,
        props as ComponentType<Args[1]>
      )
    );

    if (this.#next) {
      this.#expect.check(this.#next);
    }
    return Promise.resolve(this);
  }

  async unmount(): Promise<void> {
    this.#result.unmount();
    return Promise.resolve();
  }

  find(
    role: ByRoleMatcher,
    options?: testing.ByRoleOptions
  ): TestElement<HTMLElement, T> {
    return this.element.find(role, options);
  }

  next(value: T): RenderResult<Args, T> {
    return RenderResult.create<Args, T>({
      component: this.#component,
      container: this.#container,
      expectation: this.#expect,
      args: this.#args,
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

export class TestElement<E extends Element, T extends RenderProps> {
  static create<E extends Element, T extends RenderProps>(
    element: E,
    expectation: Expect<T>,
    next: T | undefined
  ): TestElement<E, T> {
    return new TestElement(element, expectation, next);
  }

  readonly #element: E;
  readonly #expect: Expect<T>;
  readonly #next: T | undefined;

  readonly fire: Fire;

  constructor(element: E, expectation: Expect<T>, next: T | undefined) {
    this.#element = element;
    this.#expect = expectation;
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
            let result: unknown = false;
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
