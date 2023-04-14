import { setup } from "@starbeam/preact";
import { options, render } from "preact";

import App from "./components/App.jsx";

setup(options);

const container = document.querySelector("#root");

if (!container) {
  throw Error(`#root not found`);
}

render(<App />, container);
