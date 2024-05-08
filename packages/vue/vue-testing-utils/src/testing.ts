import type { Expand } from "@starbeam/interfaces";
import {
  entryPoint,
  expect,
  RecordedEvents,
} from "@starbeam-workspace/test-utils";
import type { VueFireEventObject } from "@testing-library/vue";
import { render } from "@testing-library/vue";
import type { LooseRequired } from "@vue/shared";
import type {
  Component,
  ExtractPropTypes,
  PropType,
  RenderFunction,
  VNodeChild,
} from "vue";
import { defineComponent } from "vue";

import { RenderedApp } from "./rendered-app.js";

/**
 * Define a top-level application component (with no props).
 *
 * {@linkcode App} takes a setup function that returns a render function. The
 * setup function may either be specified as a plain function, or it may be
 * specified as:
 *
 * `{ setup: () => () => VNodeChild }`
 */
export const App = (
  options: (() => () => VNodeChild) | { setup: () => () => VNodeChild },
  /*
   eslint-disable-next-line
   @typescript-eslint/explicit-module-boundary-types
   -- see defComponent
   */
) =>
  defineComponent({
    props: [],
    setup: (): RenderFunction => {
      if (typeof options === "function") {
        return options();
      } else {
        return options.setup();
      }
    },
  });

/* 
  eslint-disable-next-line 
  @typescript-eslint/explicit-function-return-type 
  -- The return type of this function is complicated and not really exposed by
  Vue, so we just want to infer it.
*/
function defComponent<Props extends PropTypes>(
  props: Props,
  options:
    | ((props: PropsFor<Props>) => () => VNodeChild)
    | { setup: (props: PropsFor<Props>) => () => VNodeChild },
) {
  function setup(props: PropsFor<Props>): () => VNodeChild {
    return entryPoint(
      () => {
        if (typeof options === "function") {
          return options(props);
        } else {
          return options.setup(props);
        }
      },
      { entryFn: setup },
    );
  }

  return defineComponent({
    props,
    setup,
  });
}

/**
 * Define a Vue component for testing with specified props.
 *
 * This component should not be rendered directly in testing. Instead, it
 * should be invoked from the app (specified via {@linkcode App}) or a
 * descendant of the app.
 *
 * @param props The props of the component, as passed to
 * {@linkcode defineComponent} in Vue.
 * @param definition The setup function of the component.
 *
 * The `definition` parameter may be may either be specified as a plain
 * function that takes props as specified by the `props` parameter, or it may
 * be specified as:
 *
 * `{ setup: (props) => () => VNodeChild }`
 */
export function Define<Props extends PropTypes>(
  props: Props,
  definition:
    | ((props: PropsFor<Props>) => () => VNodeChild)
    | { setup: (props: PropsFor<Props>) => () => VNodeChild },
): ComponentType<Props> {
  return defComponent<Props>(props, definition);
}

type ComponentType<Props extends PropTypes> = ReturnType<
  typeof defComponent<Props>
>;

interface RenderOptions<T = void> {
  readonly events?: RecordedEvents | undefined;
  readonly output?: ExpectedHTML<T> | ((args: T) => string) | undefined;
}

interface NormalizedRenderOptions<T> {
  readonly events: RecordedEvents;
  readonly output: ExpectedHTML<T> | undefined;
}

export function renderApp<T = void>(
  app: Component<void>,
  options: RenderOptions<T> = {},
): AndExpect<T> {
  const { events, output } = normalize(options);

  const result = render(app, { container: document.createElement("div") });
  return RenderedApp.create(result, events, output);
}

function normalize<T>(options: RenderOptions<T>): NormalizedRenderOptions<T> {
  return {
    events: options.events ?? new RecordedEvents(),
    output:
      typeof options.output === "function"
        ? HTML(options.output)
        : options.output,
  };
}

export class ExpectedHTML<T> {
  static create<T>(
    this: void,
    template: (props: T) => string,
  ): ExpectedHTML<T> {
    return new ExpectedHTML(template);
  }

  readonly #template: (props: T) => string;

  constructor(template: (props: T) => string) {
    this.#template = template;
  }

  expect(container: Element, props: T): void {
    expect(container.innerHTML).toBe(this.#template(props));
  }
}

export const HTML = ExpectedHTML.create;

export const EMPTY = Symbol("EMPTY");
export type EMPTY = typeof EMPTY;

export type ExpectOptions<T> =
  | "unchanged"
  | (T extends void
      ? { events?: string[]; output: string }
      : { events?: string[]; output?: T | EMPTY });

export interface AndExpect<T> {
  /**
   * All operations on {@linkcode RenderedApp} return an object with an
   * `andExpect` method on it.
   *
   * This method is always asynchronous (it returns a promise).
   *
   * It takes expectations:
   *
   * - `"unchanged"`: assert that the rendered HTML is unchanged and no events
   *   were recorded.
   * - an object with an `events` property: assert that the specified events
   *   were recorded in the specified order. Once events are verified, they are
   *   reset to `[]`, so you don't need to keep track of events from previous
   *   expectations.
   * - an object with an `output` property:
   *   - if you passed an output expectation function to {@linkcode renderApp},
   *     the `output` property is an argument to pass to that function. The
   *     app's `innerHTML` will be verified against the return value of the
   *     function.
   *   - otherwise, the `output` property is the expected HTML.
   */
  andExpect: (args: ExpectOptions<T>) => Promise<RenderedApp<T>>;

  /**
   * A version of {@linkcode andExpect} that asserts the default behavior of
   * the operation that returned this object.
   *
   * Normally, the default expectation is to assert that the rendered HTML is
   * unchanged and no events were recorded.
   *
   * The {@linkcode unmount} method defaults to asserting that the rendered
   * HTML is empty and no events were recorded.
   */
  andAssert: () => Promise<RenderedApp<T>>;
}

Error.stackTraceLimit = Infinity;

export type EventMap = Expand<{
  [P in keyof VueFireEventObject]: VueFireEventObject[P] extends <
    N extends Document | Element | Window,
  >(
    element: N,
    ...args: infer Args
  ) => infer Return
    ? (...args: Args) => Return
    : never;
}>;

type ZERO = 0;
type ONE = 1;
export declare type IfAny<T, Y, N> = ZERO extends ONE & T ? Y : N;

type PropTypes = Readonly<Record<string, PropType<unknown>>>;

type PropsFor<Props> = Readonly<
  LooseRequired<Readonly<ExtractPropTypes<Props>> & object>
>;
