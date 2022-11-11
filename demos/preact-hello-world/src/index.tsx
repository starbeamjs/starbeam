import "preact/hooks";

import { setup } from "@starbeam/preact";
import { options, render } from "preact";

setup(options);

import App from "./components/App.jsx";

const container = document.querySelector("#root");

if (!container) {
  throw Error(`#root not found`);
}

render(<App />, container);
