import { Cell, Reactive } from "@starbeam/reactive";
import { Expects, test } from "../support/index.js";

test("a simple element containing a text node (dynamic) ", ({ dom, test }) => {
  let name = Cell("Chirag");

  let element = test.buildElement(
    "div",
    { children: [dom.text(name)] },
    Expects.dynamic
  );

  let result = test.render(element, Expects.dynamic.html("<div>Chirag</div>"));

  result.update([name, "Chi"], Expects.html("<div>Chi</div>"));
});

test("a simple element containing a text node (static) ", ({ dom, test }) => {
  const NAME = "Chirag";
  const TITLE = "Chirag's name";

  let name = Reactive.from(NAME);
  let title = Reactive.from(TITLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title },
      children: [dom.text(name)],
    },
    Expects.constant
  );

  test.render(
    element,
    Expects.constant.html(`<div title="${TITLE}">${NAME}</div>`)
  );
});

test("a simple element with an attribute (dynamic) ", ({ dom, test }) => {
  const NAME = "Chirag";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";

  let name = Cell(NAME);
  let title = Cell(TITLE);

  let element = test.buildElement(
    "div",
    {
      attributes: { title },
      children: [dom.text(name)],
    },
    Expects.dynamic
  );

  let result = test.render(
    element,
    Expects.dynamic.html(`<div title="${TITLE}">${NAME}</div>`)
  );

  result.update(
    [name, SHORT_NAME],
    Expects.html(`<div title="${TITLE}">${SHORT_NAME}</div>`)
  );
});

test("(smoke test) a dynamic element with a few children and a few attributes", ({
  dom,
  test,
}) => {
  const FIRST_NAME = "Chirag";
  const LAST_NAME = "Patel";
  const SHORT_NAME = "Chi";
  const TITLE = "Chirag's name";
  const CLASS = "person";
  const STYLE = "color: red";

  let firstName = Cell(FIRST_NAME);
  let lastName = Cell(LAST_NAME);
  let title = Cell(TITLE);
  let style = Cell(STYLE);

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
          Expects.constant
        ),
        " -- ",
        "Over and Out",
      ],
    },
    Expects.dynamic
  );

  let result = test.render(
    element,
    Expects.dynamic.html(
      `<div title="${TITLE}" class="person" style="${STYLE}">${FIRST_NAME} ${LAST_NAME} <span>(name)</span> -- Over and Out</div>`
    )
  );

  result.update(
    [firstName, SHORT_NAME],
    Expects.html(
      `<div title="${TITLE}" class="person" style="${STYLE}">${SHORT_NAME} ${LAST_NAME} <span>(name)</span> -- Over and Out</div>`
    )
  );
});
