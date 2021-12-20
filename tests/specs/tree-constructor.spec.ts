import { dom, expect, simple, starbeam, test, toBe, Minimal } from "../support";
import type { Tokenizer } from "@simple-dom/parser";

const { TreeConstructor, TreeHydrator, TOKEN } = starbeam;

test("tree constructor", ({ universe, test }) => {
  let tree = TreeConstructor.html();

  tree.add(TreeConstructor.text("hello world"));
  let token = tree.add(TreeConstructor.text("goodbye world"), TOKEN);

  let { node } = tree.construct(parse);
  let map = test.hydrate(node, new Set([token]));

  let text = map.get(token) as dom.Hydrated;

  expect(text.type, toBe("node"));
  expect((text as { node: Minimal.Text }).node.data, toBe("goodbye world"));
});

import { tokenize } from "simple-html-tokenizer";

function parse(string: string): dom.CompatibleDocumentFragment {
  let parser = new simple.HTMLParser(
    tokenize as Tokenizer,
    simple.createDocument(),
    simple.voidMap
  );

  return parser.parse(string);
}

function serialize(fragment: dom.CompatibleDocumentFragment): string {}
