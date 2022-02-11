import { cell, Root } from "starbeam";
import { JsDocument } from "./utils.js";

let document = JsDocument.create();

const universe = Root.jsdom(document.jsdom);
const html = universe.dom;

const person = cell("@littlecalculist");
const place = cell("San Francisco");

const element = html.element("div", (div) =>
  div
    .append(html.text(person))
    .append(" (")
    .append(html.text(place))
    .append(") ")
);

const result = universe.render(element, { append: document.body }).initialize();

document.contents; //?

person.update("Dave Herman");
result.poll();

document.contents; //?

place.update("California");
result.poll();

document.contents; //?
