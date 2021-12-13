import { Expects, test } from "../support";
import {
  ElementNode,
  expectElement,
  TextNode,
} from "../support/nodes/patterns";

test("a simple element containing a text node (dynamic) ", ({
  universe: timeline,
  dom,
  test,
}) => {
  let name = timeline.cell("Chirag");

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
  universe: timeline,
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

test("a simple element with an attribute (dynamic) ", ({
  universe: timeline,
  dom,
  test,
}) => {
  const NAME = "Chirag";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";

  let name = timeline.cell(NAME);
  let title = timeline.cell(TITLE);

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

test("(smoke test) a dynamic element with a few children and a few attributes", ({
  universe: timeline,
  dom,
  test,
}) => {
  const FIRST_NAME = "Chirag";
  const LAST_NAME = "Patel";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";
  const CLASS = "person";
  const STYLE = "color: red";

  let firstName = timeline.cell(FIRST_NAME);
  let lastName = timeline.cell(LAST_NAME);
  let title = timeline.cell(TITLE);
  let style = timeline.cell(STYLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title, class: CLASS, style },
      children: [
        dom.text(firstName),
        " ",
        dom.text(lastName),
        " ",
        test.buildElement(
          "span",
          { children: ["(", "name", ")"] },
          Expects.static
        ),
        " -- ",
        "Over and Out",
      ],
    },
    Expects.dynamic
  );

  let result = test.render(element, Expects.dynamic);

  expectElement(result.node, "div", {
    attributes: { title: TITLE, class: "person", style: STYLE },
    children: [
      TextNode(FIRST_NAME),
      TextNode(" "),
      TextNode(LAST_NAME),
      TextNode(" "),
      ElementNode("span", {
        children: [TextNode("("), TextNode("name"), TextNode(")")],
      }),
      TextNode(" -- "),
      TextNode("Over and Out"),
    ],
  });

  firstName.update(SHORT_NAME);
  timeline.poll(result);

  expectElement(result.node, "div", {
    attributes: { title: TITLE, class: "person", style: STYLE },
    children: [
      TextNode(SHORT_NAME),
      TextNode(" "),
      TextNode(LAST_NAME),
      TextNode(" "),
      ElementNode("span", {
        children: [TextNode("("), TextNode("name"), TextNode(")")],
      }),
      TextNode(" -- "),
      TextNode("Over and Out"),
    ],
  });
});
