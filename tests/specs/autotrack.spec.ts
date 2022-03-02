import type { Root } from "@starbeam/core";
import { Cell, Memo } from "@starbeam/reactive";
import { Dynamism } from "../support/expect/expect.js";
import { expect, Expects, test, toBe } from "../support/index.js";

test("universe.memo", () => {
  let name = Cell("Tom");
  let counter = 0;

  let nameMemo = Memo(() => {
    counter++;
    return name.current;
  });

  expect(nameMemo.current, toBe("Tom"));
  expect(counter, toBe(1));

  expect(nameMemo.current, toBe("Tom"));
  expect(counter, toBe(1));

  name.current = "Thomas";

  expect(nameMemo.current, toBe("Thomas"));
  expect(counter, toBe(2));
});

test("nested universe.memo", ({ universe }) => {
  let { firstName, fullName } = testName(universe, "Tom", "Dale");

  expect(fullName.current, toBe("Tom Dale"));

  firstName.current = "Thomas";

  expect(fullName.current, toBe("Thomas Dale"));
});

test("universe.memo => text", ({ universe, test }) => {
  let { firstName, fullName } = testName(universe, "Tom", "Dale");

  let text = test.buildText(fullName, Dynamism.Dynamic());
  let result = test.render(text, Expects.dynamic.html("Tom Dale"));

  result.update([firstName, "Thomas"], Expects.html("Thomas Dale"));
});

test("universe.memo becomes constant if the underlying cell is frozen", ({
  universe,
  test,
}) => {
  let { firstName, lastName, fullName } = testName(universe, "Tom", "Dale");

  test
    .render(
      test.buildText(fullName, Dynamism.Dynamic()),
      Expects.dynamic.html("Tom Dale")
    )
    .update([firstName, "Thomas"], Expects.dynamic.html("Thomas Dale"))
    .update(() => {
      firstName.freeze();
      lastName.freeze();
    }, Expects.constant.html("Thomas Dale"));
});

function testName(universe: Root, first: string, last: string) {
  let firstName = Cell(first);
  let lastName = Cell(last);

  let firstNameMemo = Memo(() => {
    return firstName.current;
  });

  let lastNameMemo = Memo(() => {
    return lastName.current;
  });

  let fullNameMemo = Memo(() => {
    return `${firstNameMemo.current} ${lastNameMemo.current}`;
  });

  return {
    firstName,
    lastName,
    fullName: fullNameMemo,
  };
}
