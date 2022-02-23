import { Cell } from "@starbeam/core";
import { Root } from "@starbeam/dom";
import { JsDocument } from "./utils.js";

let document = JsDocument.create();

const universe = Root.jsdom(document.jsdom);

const username = Cell("@tomdale");

const text = universe.dom.text(username);

let result = universe.render(text, { append: document.body }).initialize(); //?

document.contents; //?

username.update("@wycats");
result.poll();

document.contents; //?

username.update("Yehuda Katz");
result.poll();

document.contents; //?
