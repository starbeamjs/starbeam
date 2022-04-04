import { Cell, Formula, Reactive } from "@starbeam/reactive";
import { Dynamism } from "../support/expect/expect.js";
import { expect, Expects, test, toBe } from "../support/index.js";

test("universe.memo", () => {
  const name = Cell("Tom");
  let counter = 0;

  const nameMemo = Formula(() => {
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

test("nested.universe.memo", ({ universe }) => {
  const { firstName, fullName, counters } = testName("Tom", "Dale");

  expect(fullName.current, toBe("Tom Dale"));

  expect(counters.firstName.count, toBe(1));
  expect(counters.lastName.count, toBe(1));
  expect(counters.fullName.count, toBe(1));

  firstName.current = "Thomas";
  expect(fullName.current, toBe("Thomas Dale"));

  expect(counters.firstName.count, toBe(2));
  expect(counters.lastName.count, toBe(1));
  expect(counters.fullName.count, toBe(2));
});

test("universe.memo => text", ({ universe, test }) => {
  const { firstName, fullName } = testName("Tom", "Dale");

  const text = test.buildText(fullName, Dynamism.Dynamic());
  const result = test.render(text, Expects.dynamic.html("Tom Dale"));

  result.update([firstName, "Thomas"], Expects.html("Thomas Dale"));
});

// becomes constant if the underlying cell is frozen
test("universe.memo.frozen-cell", ({ universe, test }) => {
  let { firstName, lastName, fullName } = testName("Tom", "Dale");

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

function testName(
  first: string,
  last: string
): {
  readonly firstName: Cell<string>;
  readonly lastName: Cell<string>;
  readonly fullName: Reactive<string>;
  readonly counters: {
    readonly firstName: { readonly count: number };
    readonly lastName: { readonly count: number };
    readonly fullName: { readonly count: number };
  };
} {
  const firstName = Cell(first);
  const lastName = Cell(last);

  const firstNameCounter = {
    count: 0,
  };

  const lastNameCounter = {
    count: 0,
  };

  const fullNameCounter = {
    count: 0,
  };

  const firstNameMemo = Formula(() => {
    firstNameCounter.count++;
    return firstName.current;
  }, "firstNameMemo");

  const lastNameMemo = Formula(() => {
    lastNameCounter.count++;
    return lastName.current;
  }, "lastNameMemo");

  const fullNameMemo = Formula(() => {
    fullNameCounter.count++;
    return `${firstNameMemo.current} ${lastNameMemo.current}`;
  }, "fullNameMemo");

  return {
    firstName,
    lastName,
    fullName: fullNameMemo,
    counters: {
      firstName: firstNameCounter,
      lastName: lastNameCounter,
      fullName: fullNameCounter,
    },
  };
}
