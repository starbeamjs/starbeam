import { test, Expects, dom } from "./support";
import { expectNode, NodePattern, TextNode } from "./support/nodes/patterns";
import zip from "lodash.zip";
import { abstraction } from "./support/expect/abstraction";

test("a simple element containing a text node (dynamic) ", ({
  timeline,
  dom,
  test,
}) => {
  let name = timeline.reactive("Chirag");

  let element = test.buildElement(
    timeline.static("div"),
    (b) => {
      b.append(dom.text(name));
    },
    Expects.dynamic
  );

  let result = test.render(element, Expects.dynamic);
  expect(result.node.tagName).toBe("DIV");
  expect(result.node.firstChild).toMatchObject({
    nodeType: 3,
    nodeValue: "Chirag",
  });

  name.update("Chi");
  timeline.poll(result);

  expect(result.node.tagName).toBe("DIV");
  expect(result.node.firstChild).toMatchObject({
    nodeType: 3,
    nodeValue: "Chi",
  });
});

test("a simple element containing a text node (static) ", ({
  timeline,
  dom,
  test,
}) => {
  const NAME = "Chirag";
  const TITLE = "Chirag's name";

  let name = timeline.static(NAME);
  let title = timeline.static(TITLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title },
      children: [dom.text(name)],
    },
    Expects.static
  );

  let result = test.render(element, Expects.static);

  expectElement(result.node, "div", {
    attributes: { title: TITLE },
    children: [TextNode(NAME)],
  });
});

test("a simple element containing a text node (dynamic) ", ({
  timeline,
  dom,
  test,
}) => {
  const NAME = "Chirag";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";

  let name = timeline.reactive(NAME);
  let title = timeline.reactive(TITLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title },
      children: [dom.text(name)],
    },
    Expects.dynamic
  );

  let result = test.render(element, Expects.dynamic);

  expectElement(result.node, "div", {
    attributes: { title: TITLE },
    children: [TextNode(NAME)],
  });

  name.update(SHORT_NAME);
  timeline.poll(result);

  expectElement(result.node, "div", { children: [TextNode(SHORT_NAME)] });
});

function expectElement(
  node: dom.SimpleElement,
  tagName: string,
  options?: {
    attributes?: Record<string, string>;
    children?: readonly NodePattern[];
  }
) {
  abstraction(() =>
    expect(
      `<${node.tagName.toLowerCase()}>`,
      `element should be a <${tagName}>`
    ).toBe(`<${tagName.toLowerCase()}>`)
  );

  if (options?.attributes) {
    for (let [name, value] of Object.entries(options.attributes)) {
      abstraction(() =>
        expect(
          node.getAttribute(name),
          `attribute ${name} should be ${value}`
        ).toBe(value)
      );
    }

    abstraction(() => {
      if (options?.children) {
        expect(
          node.childNodes,
          "options.children should be the same length as the element's childNodes"
        ).toHaveLength(options.children.length);

        for (let [childNode, pattern] of zip(
          node.childNodes,
          options.children
        )) {
          abstraction(() => expectNode(childNode!, pattern!));
        }
      }
    });
  }
}
