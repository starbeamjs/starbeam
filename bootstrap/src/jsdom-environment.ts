// import jest from "@jest/globals";
import JsDomEnvironment from "jest-environment-jsdom";
import { TextDecoder, TextEncoder } from "util";

/**
 * A custom environment to set the TextEncoder and TextDecoder
 */
export default class CustomTestEnvironment extends JsDomEnvironment {
  async setup() {
    await super.setup();
    if (typeof this.global.TextEncoder === "undefined") {
      this.global.TextEncoder = TextEncoder;
    }

    if (typeof this.global.TextDecoder === "undefined") {
      this.global.TextDecoder = TextDecoder as any;
    }
  }
}
