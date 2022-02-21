import {
  Abstraction,
  lifetime,
  LOGGER,
  Memo,
  subscribe,
  type AnyRecord,
} from "@starbeam/core";
import { useDebugValue } from "react";
import {
  ReactiveComponent,
  StableProps,
  STABLE_COMPONENT,
  useStableComponent,
  type ReactiveProps,
} from "./component.js";
import { useInstance } from "./instance.js";

export function useReactive<T, Props extends AnyRecord>(
  definition: (
    props: ReactiveProps<Props>,
    parent: ReactiveComponent
  ) => () => T,
  props: Props,
  description = Abstraction.callerFrame()
) {
  useDebugValue(description);
  const component = useStableComponent();

  LOGGER.trace.log({
    in: "useReactive#parent",
    component,
    notify: component.notify,
  });

  const stableProps = component.useComponentManager(
    STABLE_COMPONENT,
    props
  ) as StableProps<Props>;

  let subscription = useInstance(() =>
    subscribe(
      Memo(definition(stableProps.reactive, component)),
      component.notify,
      description
    )
  ).instance;

  // idempotent
  lifetime.link(component, subscription);

  return subscription.poll().value;
}
// export function Component<Props extends AnyRecord>(
//   definition: (
//     props: ReactiveProps<Props>,
//     parent: ReactiveComponent
//   ) => () => ReactElement,
//   description = `component ${Abstraction.callerFrame().trimStart()}`
// ): (props: Props) => ReactElement {
// }
