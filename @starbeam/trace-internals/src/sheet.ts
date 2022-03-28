import { Stylesheet } from "./styles.js";

export const SHEET = Stylesheet.create({
  green: {
    color: "#797",
  },
  "green/bright": {
    color: "#696",
    "font-weight": "bold",
  },
  red: {
    color: "#977",
  },
  "red/bright": {
    color: "#966",
    "font-weight": "bold",
  },
  stale: {
    color: "orange",
  },
  inert: {
    color: "#999",
  },
  dim: {
    color: "#bbb",
  },
  initialize: {
    color: "magenta",
  },
}).build();
