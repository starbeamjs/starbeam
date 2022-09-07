/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type ComponentChildren, type JSX } from "preact";
import { Pane, UiPane, type UpdatePane } from "./pane.jsx";

// @ts-expect-error `?inline` URLs aren't supported by TS
import css from "./css/pane.css?inline";

import type { DevtoolsOptions } from "./shared.js";

export function TabsPane(
  into: Element,
  options: DevtoolsOptions
): UpdatePane<{ options: DevtoolsOptions }> {
  return Pane(into, { Component: Tabs, props: { options }, css });
}

function Tabs({ options }: { options: DevtoolsOptions }) {
  return (
    <UiPane>
      <section class="card starbeam-devtools">
        lorem ipsum dolor sit amet
      </section>
    </UiPane>
  );
}
