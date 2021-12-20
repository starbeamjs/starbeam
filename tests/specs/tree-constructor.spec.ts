import type { Tokenizer } from "@simple-dom/parser";
import { tokenize } from "simple-html-tokenizer";
import { dom, expect, Minimal, simple, starbeam, test, toBe } from "../support";

const { TreeConstructor, TOKEN } = starbeam;

test("tree constructor", ({ test }) => {
  return;

  let tree = TreeConstructor.html();

  tree.add(TreeConstructor.text("hello world"));
  let token = tree.add(TreeConstructor.text("goodbye world"), TOKEN);

  let { fragment: node } = tree.construct(parse);
  let map = test.hydrate(node, new Set([token]));

  let text = map.get(token) as dom.Hydrated;

  expect(text.type, toBe("node"));
  expect((text as { node: Minimal.Text }).node.data, toBe("goodbye world"));
});

function parse(string: string): dom.CompatibleDocumentFragment {
  let parser = new simple.HTMLParser(
    tokenize as Tokenizer,
    simple.createDocument(),
    simple.voidMap
  );

  return parser.parse(string);
}
