import { cell, memo, Root } from "starbeam";
import { Dynamism } from "../support/expect/expect.js";
import { expect, Expects, test, toBe } from "../support/index.js";

test("universe.memo", () => {
  let name = cell("Tom");
  let counter = 0;

  let nameMemo = memo(() => {
    counter++;
    return name.current;
  });

  expect(nameMemo.current, toBe("Tom"));
  expect(counter, toBe(1));

  expect(nameMemo.current, toBe("Tom"));
  expect(counter, toBe(1));

  name.update("Thomas");

  expect(nameMemo.current, toBe("Thomas"));
  expect(counter, toBe(2));
});

test("nested universe.memo", ({ universe }) => {
  let { firstName, fullName } = testName(universe, "Tom", "Dale");

  expect(fullName.current, toBe("Tom Dale"));

  firstName.update("Thomas");

  expect(fullName.current, toBe("Thomas Dale"));
});

test("universe.memo => text", ({ universe, test }) => {
  let { firstName, fullName } = testName(universe, "Tom", "Dale");

  let text = test.buildText(fullName, Dynamism.dynamic);
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
      test.buildText(fullName, Dynamism.dynamic),
      Expects.dynamic.html("Tom Dale")
    )
    .update([firstName, "Thomas"], Expects.dynamic.html("Thomas Dale"))
    .update(() => {
      firstName.freeze();
      lastName.freeze();
    }, Expects.constant.html("Thomas Dale"));
});

function testName(universe: Root, first: string, last: string) {
  let firstName = cell(first);
  let lastName = cell(last);

  let firstNameMemo = memo(() => {
    return firstName.current;
  });

  let lastNameMemo = memo(() => {
    return lastName.current;
  });

  let fullNameMemo = memo(() => {
    return `${firstNameMemo.current} ${lastNameMemo.current}`;
  });

  return {
    firstName,
    lastName,
    fullName: fullNameMemo,
  };
}
