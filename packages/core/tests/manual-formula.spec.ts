import { ManualFormula } from "@starbeam/core";
import { cached, reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

describe("ManualFormula", () => {
  test("basic functionality", () => {
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

    const person = new Person("Tom", "USA");

    const start = ManualFormula();
    let formatted = person.formatted(false);
    const manual = start.done();

    expect(formatted).toBe("Tom");

    poll();
    expect(formatted).toBe("Tom");

    person.name = "Thomas";

    poll();
    expect(formatted).toBe("Thomas");

    function poll() {
      const poll = manual.poll.start();
      formatted = person.formatted(false);
      poll.done();
    }
  });

  test("normal Formula inside nested formula", () => {
    const person = testName("Tom", "Dale");

    const start = ManualFormula();
    const manual = start.done();

    expect(person.fullName).toBe("Tom Dale");

    poll();
    expect(person.fullName).toBe("Tom Dale");

    person.firstName = "Thomas";

    poll();
    expect(person.fullName).toBe("Thomas Dale");

    function poll() {
      const poll = manual.poll.start();
      poll.done();
    }
  });
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
