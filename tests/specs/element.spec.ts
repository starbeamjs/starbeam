import { Expects, innerHTML, test } from "../support";

test("a simple element containing a text node (dynamic) ", ({
  universe,
  dom,
  test,
}) => {
  let name = universe.cell("Chirag");

  let element = test.buildElement(
    universe.static("div"),
    (b) => {
      b.append(dom.text(name));
    },
    Expects.dynamic
  );

  let { result, into } = test.render(element, Expects.dynamic);
  expect(innerHTML(into)).toBe("<div>Chirag</div>");

  name.update("Chi");
  universe.poll(result);

  expect(innerHTML(into)).toBe("<div>Chi</div>");
});

test("a simple element containing a text node (static) ", ({
  universe,
  dom,
  test,
}) => {
  const NAME = "Chirag";
  const TITLE = "Chirag's name";

  let name = universe.static(NAME);
  let title = universe.static(TITLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title },
      children: [dom.text(name)],
    },
    Expects.static
  );

  let { into } = test.render(element, Expects.static);

  expect(innerHTML(into)).toBe(`<div title="${TITLE}">${NAME}</div>`);
});

test("a simple element with an attribute (dynamic) ", ({
  universe,
  dom,
  test,
}) => {
  const NAME = "Chirag";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";

  let name = universe.cell(NAME);
  let title = universe.cell(TITLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title },
      children: [dom.text(name)],
    },
    Expects.dynamic
  );

  let { into, result } = test.render(element, Expects.dynamic);

  expect(innerHTML(into)).toBe(`<div title="${TITLE}">${NAME}</div>`);

  name.update(SHORT_NAME);
  universe.poll(result);

  expect(innerHTML(into)).toBe(`<div title="${TITLE}">${SHORT_NAME}</div>`);
});

test("(smoke test) a dynamic element with a few children and a few attributes", ({
  universe,
  dom,
  test,
}) => {
  const FIRST_NAME = "Chirag";
  const LAST_NAME = "Patel";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";
  const CLASS = "person";
  const STYLE = "color: red";

  let firstName = universe.cell(FIRST_NAME);
  let lastName = universe.cell(LAST_NAME);
  let title = universe.cell(TITLE);
  let style = universe.cell(STYLE);

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

  let { result, into } = test.render(element, Expects.dynamic);

  expect(innerHTML(into)).toBe(
    `<div title="${TITLE}" class="person" style="${STYLE}">${FIRST_NAME} ${LAST_NAME} <span>(name)</span> -- Over and Out</div>`
  );

  firstName.update(SHORT_NAME);
  universe.poll(result);

  expect(innerHTML(into)).toBe(
    `<div title="${TITLE}" class="person" style="${STYLE}">${SHORT_NAME} ${LAST_NAME} <span>(name)</span> -- Over and Out</div>`
  );
});
