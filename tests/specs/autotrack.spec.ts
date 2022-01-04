import { test, expect, toBe, Expects } from "../support";
import type { Universe } from "../support/starbeam";

test("timeline.memo", ({ universe }) => {
  let name = universe.cell("Tom");
  let counter = 0;

  let memo = universe.memo(() => {
    counter++;
    return name.current;
  });

  expect(memo.current, toBe("Tom"));
  expect(counter, toBe(1));

  expect(memo.current, toBe("Tom"));
  expect(counter, toBe(1));

  name.update("Thomas");

  expect(memo.current, toBe("Thomas"));
  expect(counter, toBe(2));
});

test("nested timeline.memo", ({ universe }) => {
  let { firstName, fullName } = testName(universe, "Tom", "Dale");

  expect(fullName.current, toBe("Tom Dale"));

  firstName.update("Thomas");

  expect(fullName.current, toBe("Thomas Dale"));
});

test("timeline.memo => text", ({ universe, test }) => {
  let { firstName, fullName } = testName(universe, "Tom", "Dale");

  let text = test.buildText(fullName, Expects.dynamic);
  let { result, into } = test.render(text, Expects.dynamic);

  expect(into.innerHTML, toBe("Tom Dale"));

  test.update(result, firstName, "Thomas");

  expect(into.innerHTML, toBe("Thomas Dale"));
});

function testName(universe: Universe, first: string, last: string) {
  let firstName = universe.cell(first);
  let lastName = universe.cell(last);

  let firstNameMemo = universe.memo(() => {
    return firstName.current;
  });

  let lastNameMemo = universe.memo(() => {
    return lastName.current;
  });

  let fullNameMemo = universe.memo(() => {
    return `${firstNameMemo.current} ${lastNameMemo.current}`;
  });

  return {
    firstName,
    lastName,
    fullName: fullNameMemo,
  };
}
