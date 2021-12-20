import type {
  SimpleComment,
  SimpleNode,
  SimpleText,
} from "@simple-dom/interface";
import { browser, dom, DOM, expect, simple, test, toBe } from "../support";

// This file validates that SimplestDOM is compatible with both @simple-dom and
// the TS DOM.

const doc = simple.createDocument();

test("SimpleText and browser Text are compatible with starbeam DOM", () => {
  let asSimple = doc.createTextNode("hello");
  let asBrowser = cast(asSimple);

  expect(DOM.getNodeType(asSimple), toBe(3));
  expect(DOM.getData(asSimple), toBe("hello"));

  expect(DOM.getNodeType(asBrowser), toBe(3));
  expect(DOM.getData(asBrowser), toBe("hello"));
});

test("SimpleComment and browser Comment are compatible with starbeam DOM", () => {
  let asSimple = doc.createComment("hello");
  let asBrowser = cast(asSimple);

  expect(DOM.getNodeType(asSimple), toBe(8));
  expect(DOM.getData(asSimple), toBe("hello"));

  expect(DOM.getNodeType(asBrowser), toBe(8));
  expect(DOM.getData(asBrowser), toBe("hello"));
});

/**
 * This function intentionally does a blind cast. The theory of this code is
 * that SimpleDOM *actually* is compatible with browser DOM (and TypeScript's
 * browser DOM types), but due to vagaries of the type system, that doesn't
 * appear true.
 *
 * To test that theory, we both validate that the return values of the `DOM`
 * utility behave as expected, *and* that the runtime values are correct.
 */
function cast(node: SimpleText): browser.Text;
function cast(node: SimpleComment): browser.Comment;
function cast(node: SimpleNode): Node {
  return node as any;
}
