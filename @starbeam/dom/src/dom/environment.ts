import type { browser, minimal } from "@domtree/flavors";
import type { FIXME } from "@starbeam/core";
import type { JSDOM } from "jsdom";
import { minimize } from "../verify.js";
import { MinimalDocumentUtilities } from "./streaming/compatible-dom.js";
import { Tokens } from "./streaming/token.js";

export abstract class DomEnvironment {
  static jsdom(jsdom: JSDOM): DomEnvironment {
    return WindowEnvironment.of(jsdom.window as FIXME<"Add a JSDOM flavor">);
  }

  static window(window: browser.Window): DomEnvironment {
    return WindowEnvironment.of(window);
  }

  abstract liveRange(): minimal.LiveRange;
  abstract staticRange(
    options: minimal.StaticRangeOptions
  ): minimal.StaticRange;

  readonly utils: MinimalDocumentUtilities = MinimalDocumentUtilities.of(this);
  readonly tokens: Tokens = Tokens.create(this);
}

export interface DomEnvironment {
  readonly document: minimal.Document;
}

class WindowEnvironment extends DomEnvironment {
  static of(window: browser.Window): WindowEnvironment {
    return new WindowEnvironment(window, minimize(window.document));
  }

  readonly #window: browser.Window;

  private constructor(
    window: browser.Window,
    readonly document: minimal.Document
  ) {
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
