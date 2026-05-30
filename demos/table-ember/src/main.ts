import "@fontsource/geist-sans";
import "./styles.css";
// Side-effect import: installs the Starbeam -> Glimmer tag bridge so plain
// Glimmer getters that read the Starbeam-backed model re-render on mutation.
import "@starbeam/ember";

import { renderComponent } from "@ember/renderer";

import App from "./App.js";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root element");
}

renderComponent(App, { into: element, owner: {} });
