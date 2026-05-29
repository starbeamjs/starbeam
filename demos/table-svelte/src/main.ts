import "@fontsource/geist-sans";
import "./styles.css";

import { mount } from "svelte";

import App from "./App.js";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root element");
}

mount(App, { target: element });
