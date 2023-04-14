/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/** @jsxRuntime automatic @jsxImportSource preact */

import type { JSX } from "preact";

import css from "./css/pane.css?inline";
import { Pane, UiPane, type UpdatePane } from "./pane.js";

type FIXME = any;
type DevtoolsOptions = FIXME;

export function TabsPane(
  into: Element,
  options: DevtoolsOptions
): UpdatePane<{ options: DevtoolsOptions }> {
  return Pane(into, { Component: Tabs, props: { options }, css });
}

function Tabs(_options: { options: DevtoolsOptions }): JSX.Element {
  return (
    <UiPane>
      <section class="card starbeam-devtools">
        lorem ipsum dolor sit amet
      </section>
    </UiPane>
  );
}
