import { JSDOM } from "jsdom";
import { Root } from "starbeam";
export class JsDocument {
    jsdom;
    static create() {
        return new JsDocument(new JSDOM());
    }
    universe;
    constructor(jsdom) {
        this.jsdom = jsdom;
        console.log(jsdom);
        this.universe = Root.jsdom(jsdom);
    }
    get document() {
        return this.jsdom.window.document;
    }
    get body() {
        return this.document.body;
    }
    get contents() {
        return this.body.innerHTML;
    }
    log() {
        console.log(this.contents);
    }
}
//# sourceMappingURL=utils.js.map