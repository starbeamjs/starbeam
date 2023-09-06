import type { Expand } from "@starbeam/interfaces";
import { expect, expect as vitestExpect } from "@starbeam-workspace/test-utils";
import {
  type BoundFunction,
  fireEvent,
  type queries,
  type RenderResult,
  type VueFireEventObject,
} from "@testing-library/vue";
import { render } from "@testing-library/vue";
import {
  defineComponent,
  type Plugin,
  type Prop,
  type PropType,
  type RenderFunction,
  type VNode,
} from "vue";

type ExpectHTML<T extends PropTypes | void> = T extends void
  ? (<U>(
      callback: (value: U) => string,
      initial: U,
    ) => {
      render: (props: PropsFor<void>) => StarbeamRenderResult<void, U>;
    }) &
      ((callback: (props: PropsFor<T>) => string) => {
        render: (props: PropsFor<T>) => StarbeamRenderResult<T, void>;
      })
  : (<U>(
      callback: (props: PropsFor<T>, value: U) => string,
      initial: U,
    ) => {
      render: (props: PropsFor<T>) => StarbeamRenderResult<T, U>;
    }) &
      ((callback: (props: PropsFor<T>) => string) => {
        render: (props: PropsFor<T>) => StarbeamRenderResult<T, void>;
      });

// interface RenderOptions {
//   plugin?: Plugin;
// }

// type VueRenderOptions = Partial<Parameters<typeof render>[1]>;

interface Define<T extends PropTypes | void> {
  define: (
    options: { setup: Setup<T> } | ((props: PropsFor<T>) => VNode | VNode[]),
    plugin?: Plugin,
  ) => {
    html: ExpectHTML<T>;
  };
}

export const define: Define<void>["define"] = testing().define;

export function testing(): Define<void>;
export function testing<T extends PropTypes>(props: T): Define<T>;
export function testing(props?: PropTypes): Define<PropTypes | void> {
  const lastProps = { props: undefined as undefined | PropsFor<PropTypes> };
  const hasProps = props !== undefined;

  return {
    define: (options, plugin) => {
      const component = defineComponent({
        props: props ?? [],
        setup: (props): RenderFunction => {
          const typedProps = props;
          lastProps.props = typedProps;
          if (typeof options === "function") {
            return () => options(typedProps);
          } else {
            return options.setup(typedProps);
          }
        },
      });

      return {
        html: ((
          expectHTML: (props: unknown, value?: unknown) => string,
          initial?: unknown,
        ) => {
          function checkHTML(props: unknown, value?: unknown) {
            if (hasProps) {
              return (
                expectHTML as (
                  props: PropsFor<PropTypes>,
                  value: unknown,
                ) => string
              )(props as PropsFor<PropTypes>, value);
            } else {
              return (expectHTML as (value: unknown) => string)(value);
            }
          }

          return {
            render: (props: PropsFor<PropTypes>) => {
              const global = plugin ? { global: { plugins: [plugin] } } : {};

              const result = render(component, {
                props,
                ...global,
              });
              const starbeamResult = new StarbeamRenderResult(
                result,
                result.container,
                {
                  html: checkHTML,
                },
                lastProps as { props: PropsFor<PropTypes> },
              );

              vitestExpect(starbeamResult.innerHTML).toBe(
                checkHTML(props, initial),
              );
              return starbeamResult;
            },
          };
        }) as ExpectHTML<PropTypes>,
      };
    },
  };
}

export class StarbeamRenderResult<Props extends PropTypes | void, U> {
  readonly #result: RenderResult;
  readonly #container: Element;
  readonly #expectations: {
    html: (props: PropsFor<Props>, value: U) => string;
  };
  readonly #lastProps: { props: PropsFor<Props> };

  constructor(
    result: RenderResult,
    container: Element,
    expectations: {
      html: (props: PropsFor<Props>, value: U) => string;
    },
    lastProps: { props: PropsFor<Props> },
  ) {
    this.#result = result;
    this.#container = container;
    this.#expectations = expectations;
    this.#lastProps = lastProps;
  }

  get innerHTML(): string {
    return this.#container.innerHTML;
  }

  async rerender(props: PropsFor<Props>, value: U): Promise<void>;
  async rerender(
    this: StarbeamRenderResult<Props, void>,
    props: PropsFor<Props>,
  ): Promise<void>;
  async rerender(props: PropsFor<Props>, value?: U): Promise<void> {
    await this.#result.rerender(props as object);
    this.#lastProps.props = props;

    expect(this.#container.innerHTML).toBe(
      this.#expectations.html(props, value as U),
    );
  }

  async update(callback: () => void | Promise<void>, value: U): Promise<void>;
  async update(
    this: StarbeamRenderResult<Props, void>,
    callback: () => void | Promise<void>,
  ): Promise<void>;
  async update(callback: () => void | Promise<void>, value?: U): Promise<void> {
    await callback();

    expect(this.#container.innerHTML).toBe(
      this.#expectations.html(this.#lastProps.props, value as U),
    );
  }

  unmount(): void {
    this.#result.unmount();
  }

  find<H extends HTMLElement>(
    ...args: Parameters<BoundFunction<queries.FindByRole<H>>>
  ): ReturnElement<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queries.FindByRole<H> extends (...args: any) => Promise<infer T> | infer T
      ? T
      : never
  > {
    return new ReturnElement(this.#result.findByRole(...args));
  }
}

Error.stackTraceLimit = Infinity;

export class ReturnElement<H extends HTMLElement> {
  readonly #element: Promise<H>;

  constructor(element: Promise<H>) {
    this.#element = element;
  }

  get fire(): EventMap {
    const keys = new Set(Reflect.ownKeys(fireEvent));
    for (const key of Reflect.ownKeys(Function.prototype)) {
      keys.delete(key);
    }

    const descs = Object.fromEntries(
      [...keys].map((key) => {
        return [
          key,
          {
            configurable: true,
            value: async (...args: unknown[]) => {
              return fireEvent[key as keyof typeof fireEvent](
                await this.#element,
                ...(args as never[]),
              );
            },
          },
        ];
      }),
    ) as PropertyDescriptorMap;

    return Object.defineProperties({}, descs) as EventMap;
  }
}

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

declare type InferPropType<T> = [T] extends [null]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : [T] extends [
      {
        type: null | true;
      },
    ]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : [T] extends [
      | ObjectConstructor
      | {
          type: ObjectConstructor;
        },
    ]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
  : [T] extends [
      | BooleanConstructor
      | {
          type: BooleanConstructor;
        },
    ]
  ? boolean
  : [T] extends [
      | NumberConstructor
      | {
          type: NumberConstructor;
        },
    ]
  ? number
  : [T] extends [
      | DateConstructor
      | {
          type: DateConstructor;
        },
    ]
  ? Date
  : [T] extends [
      | (infer U)[]
      | {
          type: (infer U)[];
        },
    ]
  ? U extends DateConstructor
    ? Date | InferPropType<U>
    : InferPropType<U>
  : [T] extends [Prop<infer V, infer D>]
  ? unknown extends V
    ? IfAny<V, V, D>
    : V
  : T;

type PropTypes = Readonly<Record<string, PropType<unknown>>>;
type PropsFor<Props extends PropTypes | void> = Expand<
  Props extends void
    ? void
    : {
        [P in keyof Props]: InferPropType<Props[P]>;
      }
>;

type Setup<T extends PropTypes | void> =
  | ((props: PropsFor<T>) => () => VNode)
  | ((props: PropsFor<T>) => () => VNode[]);
