import "@fontsource/geist-sans";
import "./styles.css";

import { Starbeam } from "@starbeam/vue";
import { createApp } from "vue";

import App from "./App.js";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root element");
}

createApp(App).use(Starbeam).mount(element);
