import * as testing from "@testing-library/dom";
import { getByRole, getByText } from "@testing-library/dom";
import { act } from "preact/test-utils";

type BoundFireObject = {
  [P in keyof testing.FireObject]: testing.FireObject[P] extends (
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
