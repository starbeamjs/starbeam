import { Formula, PolledFormula } from "@starbeam/core";
import { type Description, descriptionFrom } from "@starbeam/debug";
import type { Renderable } from "@starbeam/timeline";
import { LIFETIME, TIMELINE } from "@starbeam/timeline";
import { type ReactElement, useRef, useState } from "react";

import { ReactiveElement } from "./element.js";
import { useReactiveSetup } from "./use-setup.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord<T = any> = Record<PropertyKey, T>;

/**
 * {@link useReactiveElement} takes a
 * {@link ReactiveDefinition reactive constructor} and produces a
 * {@link ReactElement}.
 *
 * A {@link ReactiveDefinition reactive constructor} is a function that sets up
 * Starbeam Reactive state and returns a render function.
 *
 * The reactive constructor runs once per [activation]. The render function runs
 * once per [render], but it returns an identical {@link ReactElement} if the
 * render function's [reactive dependencies] have not changed.
 *
 * ## Using `useReactiveElement` to set up state
 *
 * ```ts
 * function Counter() {
 *   return useReactiveElement(() => {
 *     // this code runs once per activation
 *     const counter = reactive({ count: 0 });
 *
 *     return () => <>
 *       <button onClick={() => counter.count++}>++</button>
 *       <p>{count}</p>
 *     </>
 *   }
 * }
 * ```
 *
 * This approach solves the "stale closure problem". Since `counter` is stable
 * across `Counter`'s lifetime, every closure produced in the render function
 * works just as well: they all increment the same stable counter instance.
 *
 * ## Using `useReactiveElement` to register finalizers
 *
 * ```ts
 * function ArticleList() {
 *   return useReactiveElement(element => {
 *     const controller = new AbortController();
 *     const status = reactive({ state: "loading" });
 *
 *     fetch("/articles.json", { signal: controller.signal })
 *       .then(data => {
 *          status.state = "loaded";
 *          status.data = data;
 *       })
 *       .catch(error => {
 *         status.state = "error";
 *         status.error = error;
 *       });
 *
 *     // TODO: this should come from the Starbeam hook API
 *     element.on.finalize(() => controller.abort());
 *
 *     return () => {
 *       if (status.state === "loading") {
 *         return <Loading />
 *       } else if (status.state === "error") {
 *         return <Error error={status.error} />
 *       } else {
 *         return <>
 *           {
 *              status.data.map(article =>
 *                <Article key={article.id} article={article} />)
 *           }
 *         </>
 *       }
 *     }
 *   })
 * }
 * ```
 *
 * ## Using `useReactiveElement` to work with DOM elements
 *
 * ```ts
 * function Resizable({ children }) {
 *   return useReactiveElement((element) => {
 *     const div = ref(HTMLDivElement);
 *
 *     element.useModifier(div, (element) => {
 *       // TODO: this should only use the Starbeam modifier API
 *     })
 *   })
 * }
 * ```
 *
 * [activation]:
 * https://github.com/wycats/starbeam/tree/main/%40starbeam/react/GLOSSARY.md#activation
 *
 * [reactive dependencies]:
 * https://github.com/wycats/starbeam/tree/main/%40starbeam/react/GLOSSARY.md#reactive-dependencies
 */
export function useStarbeam<_T>(
  definition: ReactiveDefinition<ReactElement, void>,
  description?: string | Description
): ReactElement {
  const desc = descriptionFrom({
    type: "resource",
    api: "useStarbeam",
    fromUser: description,
  });
  const [, setNotify] = useState({});
  const last = useRef(null as ReactiveElement | null);

  return useReactiveSetup((setup) => {
    const { element } = createReactiveElement({
      prev: last.current,
      notify: () => setNotify({}),
    });

    last.current = element;

    setup.link(element);

    return PolledFormula(definition(element));
  });

  function createReactiveElement({
    prev,
    notify,
  }: {
    prev: ReactiveElement | null;
    notify: () => void;
  }): CreatedReactiveElement {
    let element: ReactiveElement;

    // Instantiate a new ReactiveElement. There is one instance per
    // activation, and it gets finalized when this hook is deactivated.
    //
    // The parameter to `.create` is a notification function that can be
    // used to trigger re-renders. This is necessary to bridge Starbeam
    // reactivity with React.
    if (prev) {
      element = ReactiveElement.reactivate(prev);
    } else {
      element = ReactiveElement.create(notify);
    }

    /**
     * Create a {@link Memo} by evaluating the "definition" parameter.
     *
     * For example, consider this call to {@link useReactiveElement}
     *
     * ```ts
     * useReactiveElement({}, () => {
     *   const counter = reactive({ counter: 0 });
     *
     *   return () => <div>{counter.count}</div>
     * })
     * ```
     *
     * The entirety of the second parameter (the arrow function) is called
     * "the definition". It can be evaluated to set up any Starbeam
     * reactivity (and register finalizers), and then it returns a function
     * that can run over and over again based on the definition.
     *
     * You can think of the outer arrow function as the component's
     * constructor, and you can think of the callback returned by the
     * constructor as the component's render function.
     *
     * We call the entire thing the component's "definition".
     *
     * So: we evaluate the definition, which sets up any reactive state. We
     * then take the function returned by the definition and turn it into a
     * Starbeam Memo.
     *
     * Because it's a Starbeam Memo, it will automatically invalidate
     * whenever any of values used in its computation change.
     *
     * From React's perspective, this means that our `useReactiveElement`
     * hook will return a stable ReactElement as long as the reactive values
     * used by the render function haven't changed. But as soon as they do,
     * our `useReactiveElement` hook will return a brand new JSX, which
     * React will reconcile.
     */

    const formula = Formula(definition(element), desc);

    /**
     * That all works, but React doesn't intrinsically know when the Formula has
     * invalidated.
     *
     * So we'll set up a Starbeam subscriber on the Formula we created. Whenever
     * that subscriber fires, we'll notify React, and React will re-render the
     * component.
     *
     * When it reaches the useReactiveElement call again, it will update the
     * stable props at {@link stableProps} and then re-enter the useResource
     * call.
     *
     * At that point, the resource will be in the `updating` state, so the
     * `updating` lifecycle hook below will run.
     */
    const renderable: Renderable<ReactElement> = TIMELINE.on.change(
      formula,
      () => {
        TIMELINE.enqueueAction(notify);
      }
    );

    LIFETIME.on.cleanup(renderable, () => {
      console.log("tearing down renderable", description);
    });

    LIFETIME.link(element, renderable);

    ReactiveElement.attach(element, renderable);

    /**
     * The resource, as far as useResource is concerned, is a record
     * containing the component and value.
     */
    return { element, value: renderable };
  }
}

export function component<Props>(
  component: (component: ReactiveElement) => (props: Props) => ReactElement,
  description?: string | Description
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (props: Props, context?: any) => ReactElement {
  const desc = descriptionFrom({
    type: "resource",
    api: "starbeam.component",
    fromUser: description,
  });

  function Component(props: Props) {
    return useStarbeam((element) => {
      const render = component(element);
      return () => render(props);
    }, desc);
  }

  Object.defineProperty(Component, "name", {
    value: desc.describe(),
  });

  return Component;
}

interface CreatedReactiveElement {
  element: ReactiveElement;
  value: Renderable<ReactElement>;
}

export type Inputs = AnyRecord | void;

type DefinitionWithProps<T, I extends AnyRecord> = (
  props: I,
  parent: ReactiveElement
) => () => T;
type SimpleDefinition<T> =
  | ((parent: ReactiveElement) => () => T)
  | (() => () => T);

type ReactiveDefinition<T, I extends Inputs> = I extends AnyRecord
  ? DefinitionWithProps<T, I>
  : SimpleDefinition<T>;
