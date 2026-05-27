import "@fontsource/geist-sans";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";

const element = document.getElementById("root");

if (!element) {
  throw new Error("Missing #root element");
}

createRoot(element).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
