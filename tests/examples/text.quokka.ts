import { cell, Root } from "starbeam";
import { JsDocument } from "./utils.js";

let document = JsDocument.create();

const universe = Root.jsdom(document.jsdom);

const username = cell("@tomdale");

const text = universe.dom.text(username);

let result = universe.render(text, { append: document.body }).initialize(); //?

document.contents; //?

username.update("@wycats");
result.poll();

document.contents; //?

username.update("Yehuda Katz");
result.poll();

document.contents; //?
