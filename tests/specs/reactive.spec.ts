import { Universe } from "starbeam";
import { expect, test, toBe } from "../support/define.js";
import { Dynamism, Expects } from "../support/expect/expect.js";

test("universe.memo", ({ universe }) => {
  const { reactive } = universe;

  class Person {
    @reactive name: string;
    @reactive country: string;

    constructor(name: string, country: string) {
      this.name = name;
      this.country = country;
    }

    formatted(country = true) {
      if (country) {
        return `${this.name} (${this.country})`;
      } else {
        return this.name;
      }
    }
  }

  let person = new Person("Tom", "USA");
  let counter = 0;

  let memo = universe.memo(() => {
    counter++;
    return person.formatted(false);
  });

  expect(memo.current, toBe("Tom"));
  expect(counter, toBe(1));

  expect(memo.current, toBe("Tom"));
  expect(counter, toBe(1));

  person.name = "Thomas";

  expect(memo.current, toBe("Thomas"));
  expect(counter, toBe(2));
});

test("nested universe.memo", ({ universe }) => {
  let person = testName(universe, "Tom", "Dale");

  expect(person.fullName, toBe("Tom Dale"));

  person.firstName = "Thomas";

  expect(person.fullName, toBe("Thomas Dale"));
});

test("universe.memo => text", ({ universe, test }) => {
  let person = testName(universe, "Tom", "Dale");

  let text = test.buildText(
    universe.memo(() => person.fullName),
    Dynamism.dynamic
  );

  test
    .render(text, Expects.dynamic.html("Tom Dale"))
    .update(() => (person.firstName = "Thomas"), Expects.html("Thomas Dale"));
});

function testName(universe: Universe, first: string, last: string) {
  let { reactive, cached } = universe;

  class Person {
    @reactive firstName: string;
    @reactive lastName: string;

    constructor(first: string, last: string) {
      this.firstName = first;
      this.lastName = last;
    }

    @cached get firstNameMemo(): string {
      return this.firstName;
    }

    @cached get lastNameMemo(): string {
      return this.lastName;
    }

    @cached get fullName(): string {
      return `${this.firstNameMemo} ${this.lastNameMemo}`;
    }
  }

  return new Person(first, last);
}
