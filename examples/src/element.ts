import { Cell } from "@starbeam/core";
import { Root } from "@starbeam/dom";
import { JsDocument } from "./utils.js";

let document = JsDocument.create();

const universe = Root.jsdom(document.jsdom);
const html = universe.dom;

const person = Cell("@littlecalculist");
const place = Cell("San Francisco");

const element = html.element("div", (div) =>
  div
    .append(html.text(person))
    .append(" (")
    .append(html.text(place))
    .append(") ")
);

const result = universe.render(element, { append: document.body }).initialize();

document.contents; //?

person.current = "Dave Herman";
result.poll();

document.contents; //?

place.current = "California";
result.poll();

document.contents; //?
