import { minimize } from "@starbeam/core";
import { MinimalDocumentUtilities } from "./streaming/compatible-dom.js";
import { Tokens } from "./streaming/token.js";
export class DomEnvironment {
    static jsdom(jsdom) {
        return WindowEnvironment.of(jsdom.window);
    }
    static window(window) {
        return WindowEnvironment.of(window);
    }
    utils = MinimalDocumentUtilities.of(this);
    tokens = Tokens.create(this);
}
// class JsDomEnvironment extends DomEnvironment {
//   readonly #jsdom: JSDOM;
//   constructor(jsdom: JSDOM, readonly document: minimal.Document) {
//     super();
//     this.#jsdom = jsdom;
//   }
//   liveRange(): minimal.LiveRange {
//     return new this.#jsdom.window.Range() as unknown as minimal.LiveRange;
//   }
//   staticRange(options: minimal.StaticRangeOptions): minimal.StaticRange {
//     return new this.#jsdom.window.StaticRange(
//       options as browser.StaticRangeOptions
//     ) as minimal.StaticRange;
//   }
// }
class WindowEnvironment extends DomEnvironment {
    document;
    static of(window) {
        return new WindowEnvironment(window, minimize(window.document));
    }
    #window;
    constructor(window, document) {
        super();
        this.document = document;
        this.#window = window;
    }
    liveRange() {
        return this.document.createRange();
    }
    staticRange(options) {
        return new this.#window.StaticRange(options);
    }
}
//# sourceMappingURL=environment.js.map