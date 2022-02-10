import { JSDOM } from "jsdom";
import { Universe } from "starbeam";

export class JsDocument {
  static create(): JsDocument {
    return new JsDocument(new JSDOM());
  }

  readonly universe: Universe;

  constructor(readonly jsdom: JSDOM) {
    console.log(jsdom);
    this.universe = Universe.jsdom(jsdom);
  }

  get document() {
    return this.jsdom.window.document;
  }

  get body() {
    return this.document.body;
  }

  get contents(): string {
    return this.body.innerHTML;
  }

  log() {
    console.log(this.contents);
  }
}
