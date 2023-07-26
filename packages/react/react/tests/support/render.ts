import { Starbeam } from "@starbeam/react";
import { react } from "@starbeam-workspace/react-test-utils";
import {
  createElement,
  type FunctionComponent,
  type ReactElement,
} from "react";

export function usingStarbeam(component: FunctionComponent<void>): ReactElement;
export function usingStarbeam<P>(
  component: FunctionComponent<P>,
  props: P
): ReactElement;
export function usingStarbeam(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FunctionComponent<any>,
  props?: unknown
): ReactElement {
  return createElement(Starbeam, null, react.render(component, props));
}
