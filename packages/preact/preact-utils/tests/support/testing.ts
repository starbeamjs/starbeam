import * as testing from "@testing-library/preact";
import type * as dom from "@testing-library/dom";
import { getByRole, getByText } from "@testing-library/dom";
import {
  createElement,
  type Attributes,
  type ComponentClass,
  type ComponentType,
  type FunctionComponent,
  type VNode,
} from "preact";
import { act } from "preact/test-utils";

type TestComponentType<P> =
  | ComponentClass<P>
  | (FunctionComponent<P> extends (...args: infer A) => infer R
      ? (...args: A) => R | VNode[]
      : never);

export async function render<P>(
  component: TestComponentType<P>,
  props: Attributes & P,
  into: Element = document.createElement("div")
): Promise<RenderResult<P>> {
  return new Render(component, props, into).render();
}

class Render<P> {
  readonly #component: TestComponentType<P>;
  #props: Attributes & P;
  readonly #into: Element;

  constructor(
    component: TestComponentType<P>,
    props: Attributes & P,
    into: Element
  ) {
    this.#component = component;
    this.#props = props;
    this.#into = into;
  }

  async render(): Promise<RenderResult<P>> {
    const result = testing.render(
      createElement(this.#component as ComponentType<P>, this.#props),
      {
        container: this.#into as Element,
      }
    );
    return new RenderResult(this.#component, this.#into, this.#props, result);
  }
}

class RenderResult<P> {
  readonly #component: TestComponentType<P>;
  readonly #container: Element;
  #props: Attributes & P;
  #result: testing.RenderResult;

  constructor(
    component: TestComponentType<P>,
    container: Element,
    props: Attributes & P,
    result: testing.RenderResult
  ) {
    this.#component = component;
    this.#container = container;
    this.#props = props;
    this.#result = result;
  }

  async render(props?: P): Promise<RenderResult<P>> {
    if (props) {
      this.#props = props;
    }
    this.#result.rerender(
      createElement(this.#component as ComponentType<P>, this.#props)
    );
    return this;
  }

  get element(): TestElement<Element> {
    return TestElement.create(this.#container);
  }
}

type BoundFireObject = {
  [P in keyof dom.FireObject]: dom.FireObject[P] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      let result = false;

      await act(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        result = method(this.#element, ...args);
      });

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
