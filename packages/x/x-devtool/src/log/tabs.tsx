/** @jsxRuntime automatic @jsxImportSource preact */

import type { JSX } from "preact";

import css from "./css/pane.css?inline";
import { type UpdatePane, Pane, UiPane } from "./pane.jsx";
import type { DevtoolsOptions } from "./shared.js";

export function TabsPane(
  into: Element,
  options: DevtoolsOptions
): UpdatePane<{ options: DevtoolsOptions }> {
  return Pane(into, { Component: Tabs, props: { options }, css });
}

// eslint-disable-next-line unused-imports/no-unused-vars
function Tabs({ options }: { options: DevtoolsOptions }): JSX.Element {
  return (
    <UiPane>
      <section class="card starbeam-devtools">
        lorem ipsum dolor sit amet
      </section>
    </UiPane>
  );
}
