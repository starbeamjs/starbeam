import { Universe } from "starbeam";
import { JsDocument } from "./utils.js";

let document = JsDocument.create();

const universe = Universe.jsdom(document.jsdom);

const username = universe.cell("@tomdale");

const text = universe.dom.text(username);

let result = universe.render(text, { append: document.body }).initialize(); //?

document.contents; //?

username.update("@wycats");
result.poll();

document.contents; //?
