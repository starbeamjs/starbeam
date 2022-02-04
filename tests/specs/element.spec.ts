import { Expects, test } from "../support/index.js";

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

  let result = test.render(element, Expects.dynamic.html("<div>Chirag</div>"));

  result.update([name, "Chi"], Expects.html("<div>Chi</div>"));
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
    Expects.constant
  );

  test.render(
    element,
    Expects.constant.html(`<div title="${TITLE}">${NAME}</div>`)
  );
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
