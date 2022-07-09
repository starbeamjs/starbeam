/* eslint-disable */

import { TIMELINE } from "@starbeam/core";
import { callerStack, entryPoint, Stack } from "@starbeam/debug";
import * as testing from "@testing-library/react";
import { getByRole, getByText, waitFor } from "@testing-library/react";
import {
  type FunctionComponent,
  type ReactElement,
  createElement,
  StrictMode,
} from "react";
import { expect, test } from "vitest";

import { react } from "./dom.js";
import { act } from "./act.js";

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
    caller = callerStack()
  ): Promise<RenderResult<Props, T>> {
    await this.act(() => this.#rerender(props), caller);
    await TIMELINE.nextIdle();

    return entryPoint(
      () => {
        SetupTestRender.assert(this.#setup, this);

        return this;
      },
      { stack: caller }
    );
  }

  async act(behavior: () => void, caller = callerStack()): Promise<void> {
    const prev = this.#state.renderCount;
    entryPoint(
      () => {
        act(behavior);
      },
      { stack: caller }
    );
    await this.rendered(prev, caller);
  }

  async rendered(prev: number, caller = callerStack()): Promise<void> {
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

  unmount(): Promise<void> {
    this.#result.unmount();
    return TIMELINE.nextIdle();
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

    await TIMELINE.nextIdle();

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
  testStrictAndLoose.strict(name, modes, test.skip);
  testStrictAndLoose.loose(name, modes, test.skip);
};

testStrictAndLoose.strict = <Props, T>(
  name: string,
  modes: TestModes<Props, T>,
  testFn: typeof test | typeof test.skip = test
) => {
  testFn(`${name} (strict mode)`, async () => {
    const setup = new SetupTestRender<Props, T>({ wrapper: StrictMode });
    return modes(Mode.strict, setup);
  });
};

testStrictAndLoose.loose = <Props, T>(
  name: string,
  modes: TestModes<Props, T>,
  testFn: typeof test | typeof test.skip = test
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
      const result = method(this.#element, ...args);
      await TIMELINE.nextIdle();
      return result;
    };
  }

  find(
    this: TestElement<HTMLElement>,
    role: testing.ByRoleMatcher,
    options?: testing.ByRoleOptions
  ) {
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

// #region commented

// export class RenderResult<Props, T> {
//   // static render<Props, T>(
//   //   component: (props: Props) => ReactElement,
//   //   options: RenderResultOptions<Props, T>
//   // ): RenderResult<Props, T>;
//   // static render<Props, T>(
//   //   component: () => ReactElement,
//   //   options: RenderResultConfiguration<T>
//   // ): RenderResult<Props, T>;
//   // static render<Props, T>(
//   //   component: (props?: Props) => ReactElement,
//   //   options: RenderResultConfiguration<T> & { readonly props?: Props }
//   // ): RenderResult<Props, T> {
//   //   const result = act(() => render(component(options.props)));
//   //   return new RenderResult(result, component, {
//   //     ...options,
//   //     snapshot: RenderSnapshot.create<T>(result.container),
//   //   });
//   // }

//   readonly #result: UpstreamRenderResult;
//   readonly #component: (props: Props) => ReactElement;
//   readonly #state: RenderResultState<T>;

//   constructor(
//     result: UpstreamRenderResult,
//     component: (props: Props) => ReactElement,
//     state: RenderResultState<T>
//   ) {
//     this.#result = result;
//     this.#component = component;
//     this.#state = state;
//   }

//   // /**
//   //  * This test facility helps you automatically verify that values that are
//   //  * expected to be stable across renders actually are stable.
//   //  *
//   //  * If you mark a `RenderResult` as `expectStable`, the `RenderResult` will
//   //  * validate that the value is stable (doesn't change its identity) every time
//   //  * you check it explicitly and every time you re-render.
//   //  */
//   // expectStableValue(): RenderResult<Props, T> {
//   //   return new RenderResult(this.#result, this.#component, {
//   //     ...this.#state,
//   //     snapshot: this.#state.snapshot.expectStable(this.values.stability()),
//   //   });
//   // }

//   // expectStable<U>(value: (value: T) => U): RenderResult<Props, T> {
//   //   return new RenderResult(this.#result, this.#component, {
//   //     ...this.#state,
//   //     snapshot: this.#state.snapshot.expectStableValue(value),
//   //   });
//   // }

//   // expectHTML(template: HtmlTemplate<T>): RenderResult<Props, T> {
//   //   return new RenderResult(this.#result, this.#component, {
//   //     ...this.#state,
//   //     snapshot: this.#state.snapshot.expectHTML(template),
//   //   });
//   // }

//   find(role: ByRoleMatcher, options?: ByRoleOptions) {
//     return this.container.find(role, options);
//   }

//   findByText(id: Matcher, options?: SelectorMatcherOptions) {
//     return this.container.findByText(id, options);
//   }

//   get fire(): BoundFireObject {
//     return this.container.fire;
//   }

//   get values(): Values<T> {
//     return this.#state.values;
//   }

//   get container(): TestElement<HTMLElement> {
//     return TestElement.create(this.#result.container, () => this.#assert());
//   }

//   get element(): Element {
//     return this.#result.container;
//   }

//   get textContent() {
//     return this.container.textContent;
//   }

//   get innerHTML() {
//     return this.container.innerHTML;
//   }

//   get count(): number {
//     return this.#state.count();
//   }

//   get value(): T {
//     Values.settle(this.#state.values);
//     return this.#state.values.last;
//   }

//   readonly rerender = async (
//     props?: Props
//   ): Promise<{ expecting: RerenderContext<T> }> => {
//     if (props) {
//       this.#result.rerender(this.#component(props));
//     } else {
//       act(() => {
//         this.#state.rerender.current();
//       });
//     }

//     await TIMELINE.nextIdle();
//     return { expecting: this.#postcondition() };
//   };

//   unmount(): { expecting: RerenderContext<T> } {
//     return entryPoint(() => {
//       this.#result.unmount();

//       return { expecting: this.#postcondition() };
//     });
//   }

//   #postcondition(): RerenderContext<T> {
//     Values.settle(this.#state.values);

//     return new RenderResult(this.#result, this.#component, {
//       ...this.#state,
//       snapshot: this.#state.snapshot.unmounted(),
//     }).#assert();
//   }

//   #assert(): RerenderContext<T> {
//     const [prev, next] = [this.#state.snapshot, this.#state.snapshot.next()];
//     this.#state.snapshot = next;
//     const context = RerenderContext.create(prev, next);

//     RerenderContext.assert<T>(context, this);
//     return context;
//   }
// }

// interface Snapshot {
//   readonly container: Element;
// }

// function snapshot(container: Element): Snapshot {
//   return { container: container.cloneNode(true) as Element };
// }

// class StableValue<T, U> {
//   static create<T, U>(
//     value: (value: T) => U,
//     expectedStability: STABLE | UNSTABLE
//   ): StableValue<T, U> {
//     return new StableValue(value, expectedStability, UNINITIALIZED);
//   }

//   readonly #value: (value: T) => U;
//   readonly #expectedStability: STABLE | UNSTABLE;
//   #current: U | UNINITIALIZED;

//   private constructor(
//     value: (value: T) => U,
//     expectedStability: STABLE | UNSTABLE,
//     last: U | UNINITIALIZED
//   ) {
//     this.#value = value;
//     this.#expectedStability = expectedStability;
//     this.#current = last;
//   }

//   assert(value: T) {
//     const stability = this.#check(value);

//     if (stability === this.#expectedStability) {
//       return;
//     } else {
//       expect(stability).toBe(this.#expectedStability);
//     }
//   }

//   #check(value: T): STABLE | UNSTABLE {
//     const prev = this.#current;
//     const next = (this.#current = this.#value(value));

//     if (prev === UNINITIALIZED || prev === next) {
//       return STABLE;
//     } else {
//       return UNSTABLE;
//     }
//   }
// }

// class RenderSnapshot {
//   constructor(
//     readonly container: HTMLElement,
//     readonly snapshot: Snapshot,
//     readonly expectations: RenderExpectations<any>
//   ) {}

//   next(): RenderSnapshot {
//     return new RenderSnapshot(
//       this.container,
//       snapshot(this.container),
//       this.expectations
//     );
//   }

//   unmounted(): RenderSnapshot {
//     return new RenderSnapshot(
//       this.container,
//       this.snapshot,
//       this.expectations.unmounted()
//     );
//   }

//   assertStability() {
//     if (this.expectations.stability) {
//       expect(this.expectations.stability.check()).toBe(STABLE);
//     }
//   }

//   assertHTML(value: any) {
//     if (this.expectations.html) {
//       const expected = this.expectations.html(value);
//       const actual = this.snapshot.container.innerHTML;
//       expect(actual).toBe(expected);
//     }
//   }
// }

// class RenderExpectations<T> {
//   static create<T>(): RenderExpectations<T> {
//     return new RenderExpectations([], null, null);
//   }

//   private constructor(
//     readonly stableValues: StableValue<T, unknown>[],
//     readonly stability: Stability | null,
//     readonly html: HtmlTemplate<T> | null
//   ) {}

//   expectStable(stability: Stability): RenderExpectations<T> {
//     return new RenderExpectations(this.stableValues, stability, this.html);
//   }

//   expectStableValue<U>(value: (value: T) => U): RenderExpectations<T> {
//     return new RenderExpectations(
//       [...this.stableValues, StableValue.create(value, STABLE)],
//       this.stability,
//       this.html
//     );
//   }

//   unmounted(): RenderExpectations<T> {
//     return new RenderExpectations(this.stableValues, this.stability, null);
//   }

//   expectHTML(template: HtmlTemplate<T>): RenderExpectations<T> {
//     return new RenderExpectations(this.stableValues, this.stability, template);
//   }

//   render<Props, T>(
//     component: (props: Props) => ReactElement,
//     options: RenderResultOptions<Props, T>
//   ): RenderResult<Props, T>;
//   render<Props, T>(
//     component: () => ReactElement,
//     options: RenderResultConfiguration<T>
//   ): RenderResult<Props, T>;
//   render<Props, T>(
//     component: (props?: Props) => ReactElement,
//     options: RenderResultConfiguration<T> & { readonly props?: Props }
//   ): RenderResult<Props, T> {
//     const result = act(() => render(component(options.props)));
//     return new RenderResult(result, component, {
//       ...options,
//       snapshot: new RenderSnapshot<T>(
//         result.container,
//         snapshot(result.container),
//         this
//       ),
//     });
//   }
// }

// class RerenderContext<T> {
//   static create<T>(
//     previous: RenderSnapshot,
//     current: RenderSnapshot
//   ): RerenderContext<T> {
//     return new RerenderContext(previous, current);
//   }

//   static expectHTML<T>(
//     context: RerenderContext<T>,
//     result: RenderResult<any, T>
//   ) {
//     if (context.#current.html) {
//       const expectedHTML = context.#current.html(result.value);
//       context.html(expectedHTML);
//     }
//   }

//   static assert<T>(
//     context: RerenderContext<T>,
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     result: RenderResult<any, T>
//   ): RerenderContext<T> {
//     if (context.#current.stability) {
//       context.#current.stability.check();
//     }

//     RerenderContext.expectHTML(context, result);

//     for (const value of context.#current.stableValues) {
//       value.assert(result.value);
//     }

//     return context;
//   }

//   readonly #last: RenderSnapshot;
//   readonly #current: RenderSnapshot;

//   constructor(last: RenderSnapshot, current: RenderSnapshot) {
//     this.#last = last;
//     this.#current = current;
//   }

//   html(expected: string): this {
//     entryPoint(() => {
//       expect(this.#current.container.innerHTML).toBe(expected);
//     });

//     return this;
//   }

//   stableHTML(): this {
//     entryPoint(() => {
//       this.html(this.#last.container.innerHTML);
//     });

//     return this;
//   }
// }

// export const STABLE = "the value\nwas stable\nsince the last time you checked";
// export type STABLE = typeof STABLE;
// export const UNSTABLE = "the value\nchanged\nsince the last time you checked";
// export type UNSTABLE = typeof UNSTABLE;

// interface Stability {
//   check: (this: void) => STABLE | UNSTABLE;
// }

// class Values<T> {
//   static create<T>(): Values<T> {
//     return new Values([], []);
//   }

//   static push<T>(values: Values<T>, value: T): void {
//     values.#values.push(value);
//   }

//   static settle<T>(values: Values<T>) {
//     if (values.#values.length === 0) {
//       throw Error(
//         `The values array is unexpectedly empty (even though we expect that rendering has occurred)`
//       );
//     }

//     values.#settled.push(values.last);
//   }

//   #values: T[];
//   #settled: T[];

//   constructor(values: T[], settled: T[]) {
//     this.#values = values;
//     this.#settled = settled;
//   }

//   [Symbol.for("nodejs.util.inspect.custom")]() {
//     return {
//       values: this.#values,
//       settled: this.#settled,
//     };
//   }

//   stability(): Stability {
//     const initial = this.last;

//     return {
//       check: () => (initial === this.last ? STABLE : UNSTABLE),
//     };
//   }

//   get all(): readonly T[] {
//     return [...this.#settled];
//   }

//   get unique(): Set<T> {
//     return new Set(this.#settled);
//   }

//   get last(): T {
//     if (this.#values.length === 0) {
//       throw Error(
//         `The values array is unexpectedly empty (even though we expect that rendering has occurred)`
//       );
//     }

//     return this.#values[this.#values.length - 1];
//   }
// }

// export class Mode {
//   constructor(readonly mode: "strict" | "loose") {}

//   match<T>(matcher: { strict: () => T; loose: () => T }): T {
//     return matcher[this.mode]();
//   }

//   // render(component: FunctionComponent): RenderResult {
//   //   return RenderResult.render(() => this.root(component));
//   // }

//   test<T, Props extends object>(
//     definition: (props: Props) => { dom: ReactElement; value: T },
//     props: Props
//   ): RenderResult<Props, T>;
//   test<T>(
//     definition: () => { dom: ReactElement; value: T }
//   ): RenderResult<void, T>;
//   test<T, Props extends object>(
//     definition: (props?: Props) => { dom: ReactElement; value: T },
//     props?: Props
//   ): RenderResult<Props, T> {
//     const rerender: { current: () => void } = { current: () => null };
//     let renderCount = 0;
//     const values: Values<T> = Values.create();

//     function Component(props?: Props): ReactElement {
//       const [, setNotify] = useState({});
//       rerender.current = () => setNotify({});
//       renderCount++;

//       const { dom, value: returnValue } = definition(props);
//       Values.push(values, returnValue);
//       return dom;
//     }

//     return RenderResult.render((props) => this.#root(Component, props), {
//       props,
//       values,
//       rerender,
//       count: () => renderCount,
//     });
//   }

//   #root<Props extends object>(
//     component: FunctionComponent<Props>,
//     props?: Props
//   ): ReactElement {
//     switch (this.mode) {
//       case "loose":
//         return createElement(component, props);
//       case "strict":
//         return strictElement(component);
//     }
//   }
// }

// export function testStrictAndLoose(
//   description: string,
//   callback: (mode: Mode) => void | Promise<void>
// ): void {
//   testStrictAndLoose.strict(description, callback);
//   testStrictAndLoose.loose(description, callback);
// }

// testStrictAndLoose.strict = (
//   description: string,
//   callback: (mode: Mode) => void | Promise<void>
// ) => {
//   test(`strict mode: ${description}`, async () => {
//     await callback(new Mode("strict"));
//   });
// };

// testStrictAndLoose.loose = (
//   description: string,
//   callback: (mode: Mode) => void | Promise<void>
// ) => {
//   test(`loose mode: ${description}`, async () => {
//     await callback(new Mode("loose"));
//   });
// };
// #endregion

export function strictElement<Props extends object>(
  component: FunctionComponent<Props>,
  props?: Props
) {
  return createElement(StrictMode, null, createElement(component, props));
}
