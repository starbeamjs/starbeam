import { cached, reactive } from "@starbeam/core";
import { Formula } from "@starbeam/reactive";
import { expect, test, toBe } from "../support/define.js";

test("Formula", () => {
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

  let formatted = Formula(() => {
    counter++;
    return person.formatted(false);
  });

  expect(formatted.current, toBe("Tom"));
  expect(counter, toBe(1));

  expect(formatted.current, toBe("Tom"));
  expect(counter, toBe(1));

  person.name = "Thomas";

  expect(formatted.current, toBe("Thomas"));
  expect(counter, toBe(2));
});

test("nested Formula", () => {
  let person = testName("Tom", "Dale");

  expect(person.fullName, toBe("Tom Dale"));

  person.firstName = "Thomas";

  expect(person.fullName, toBe("Thomas Dale"));
});

export interface Person {
  firstName: string;
  lastName: string;
  readonly fullName: string;
}

export function testName(first: string, last: string): Person {
  class TestPerson {
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

  return new TestPerson(first, last);
}
