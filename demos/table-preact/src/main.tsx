import "@fontsource/geist-sans";
import "./styles.css";

import { install } from "@starbeam/preact";
import { options, render } from "preact";

import { App } from "./App.js";

install(options);

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root element");
}

render(<App />, element);
