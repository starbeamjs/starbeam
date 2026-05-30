import "@fontsource/geist-sans";
import "./styles.css";
// Side-effect import: installs the Starbeam -> Glimmer tag bridge so plain
// Glimmer getters that read the Starbeam-backed model re-render on mutation.
import "@starbeam/ember";

import { renderComponent } from "@ember/renderer";

import App from "./App.gts";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root element");
}

// ESLint's TypeScript parser doesn't understand `.gts`, so `App` comes in
// untyped here. Glint (`ember-tsc`) is what actually type-checks this import.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
renderComponent(App, { into: element, owner: {} });
