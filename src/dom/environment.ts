import type { browser, minimal } from "@domtree/flavors";
import type { JSDOM } from "jsdom";
import { minimize } from "../strippable/minimal";
import { MinimalDocumentUtilities } from "./streaming/compatible-dom";
import { Tokens } from "./streaming/token";

export abstract class DomEnvironment {
  static jsdom(jsdom: JSDOM): DomEnvironment {
    return new JsDomEnvironment(jsdom, minimize(jsdom.window.document));
  }

  static browser(window: globalThis.Window): DomEnvironment {
    return new BrowserEnvironment(window, minimize(window.document));
  }

  abstract readonly document: minimal.Document;
  abstract liveRange(): minimal.LiveRange;
  abstract staticRange(
    options: minimal.StaticRangeOptions
  ): minimal.StaticRange;

  readonly utils: MinimalDocumentUtilities = MinimalDocumentUtilities.of(this);
  readonly tokens: Tokens = Tokens.create(this);
}

class JsDomEnvironment extends DomEnvironment {
  readonly #jsdom: JSDOM;

  constructor(jsdom: JSDOM, readonly document: minimal.Document) {
    super();
    this.#jsdom = jsdom;
  }

  liveRange(): minimal.LiveRange {
    return new this.#jsdom.window.Range() as unknown as minimal.LiveRange;
  }

  staticRange(options: minimal.StaticRangeOptions): minimal.StaticRange {
    return new this.#jsdom.window.StaticRange(
      options as browser.StaticRangeOptions
    ) as minimal.StaticRange;
  }
}

class BrowserEnvironment extends DomEnvironment {
  static of(window: globalThis.Window): BrowserEnvironment {
    return new BrowserEnvironment(window, minimize(window.document));
  }

  readonly #window: globalThis.Window;

  constructor(window: globalThis.Window, readonly document: minimal.Document) {
    super();
    this.#window = window;
  }

  liveRange(): minimal.LiveRange {
    return this.document.createRange() as minimal.LiveRange;
  }

  staticRange(options: minimal.StaticRangeOptions): minimal.StaticRange {
    return new this.#window.StaticRange(
      options as browser.StaticRangeOptions
    ) as minimal.StaticRange;
  }
}
