import { Root } from "@starbeam/dom";
import { Cell } from "@starbeam/reactive";
import { JsDocument } from "./utils.js";

let document = JsDocument.create();

const universe = Root.jsdom(document.jsdom);

const username = Cell("@tomdale");

const text = universe.dom.text(username);

let result = universe.render(text, { append: document.body }).initialize(); //?

document.contents; //?

username.current = "@wycats";
result.poll();

document.contents; //?

username.current = "Yehuda Katz";
result.poll();

document.contents; //?
