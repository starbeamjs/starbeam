/** @jsxImportSource preact */

import { install } from "@starbeam/preact";
import { App } from "@starbeam-demos/table-preact/src/App.js";
import type { VNode } from "preact";
import { options } from "preact";

install(options);

export default function PreactInventoryDemo(): VNode {
  return <App />;
}
