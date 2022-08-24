import { Cell, FormulaFn } from "@starbeam/core";
// eslint-disable-next-line unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars
import { cached, reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

describe("A reactive formula", () => {
  test("can be validated", () => {
    const name = Cell("@tomdale");
    const location = Cell("New York");

    const card = FormulaFn(() => `${name.current} (${location.current})`);

    expect(card()).toBe("@tomdale (New York)");

    name.set("Tom Dale");

    expect(card()).toBe("Tom Dale (New York)");
  });

  test("produces stable values if inputs don't change", () => {
    const name = Cell("@tomdale", "name");
    const location = Cell("New York", "location");

    const card = FormulaFn(
      () => ({
        name: name.current,
        location: location.current,
      }),
      "card"
    );

    let last = card.current;

    expect(last).toEqual({
      name: "@tomdale",
      location: "New York",
    });

    expect(card.current).toBe(last);

    name.set("Tom Dale");

    let next = card.current;

    expect(next).toEqual({
      name: "Tom Dale",
      location: "New York",
    });

    expect(next).not.toBe(last);
    last = next;

    expect(card.current).toBe(last);

    location.set("San Francisco");

    next = card.current;

    expect(next).toEqual({
      name: "Tom Dale",
      location: "San Francisco",
    });

    expect(next).not.toBe(last);
  });

  test("setting a cell to an identical value according to Object.is doesn't invalidate formulas that depend on it", () => {
    const name = Cell("@tomdale");
    const location = Cell("New York");

    const card = FormulaFn(() => ({
      name: name.current,
      location: location.current,
    }));

    const last = card.current;

    expect(last).toEqual({
      name: "@tomdale",
      location: "New York",
    });

    expect(card.current).toBe(last);

    // set the name to the same value
    name.set("@tomdale");

    const next = card.current;

    expect(next).toEqual({
      name: "@tomdale",
      location: "New York",
    });

    expect(next).toBe(last);
  });

  test("a custom equals function can be used to determine whether a new value is equal to the current value", () => {
    const person = Cell(
      {
        name: "Tom Dale",
        location: "New York",
      },
      { equals: (a, b) => a.name === b.name && a.location === b.location }
    );

    const card = FormulaFn(() => ({
      name: person.current.name,
      location: person.current.location,
    }));

    const lastCard = card.current;
    const lastPerson = person.current;

    expect(lastCard).toEqual({
      name: "Tom Dale",
      location: "New York",
    });

    expect(lastPerson).toEqual({
      name: "Tom Dale",
      location: "New York",
    });

    // Intentionally set the person to a new object with the same name and
    // location. This would fail the Object.is test, but the custom equality
    // function should prevent the formula from being invalidated.
    person.set({
      name: "Tom Dale",
      location: "New York",
    });

    const nextCard = card.current;
    const nextPerson = person.current;

    expect(nextCard).toEqual({
      name: "Tom Dale",
      location: "New York",
    });

    expect(nextPerson).toEqual({
      name: "Tom Dale",
      location: "New York",
    });

    expect(lastCard).toBe(nextCard);
    expect(lastPerson).toBe(nextPerson);
  });

  test("formulas that invoke other formulas", () => {
    const name = Cell("@tomdale");
    const location = Cell("New York");
    const organization = Cell("LinkedIn");

    const card = FormulaFn(() => `${name.current} (${location.current})`);
    const complete = FormulaFn(
      () => `${card.current} at ${organization.current}`
    );

    expect(complete.current).toBe("@tomdale (New York) at LinkedIn");

    name.set("Tom Dale");

    expect(complete.current).toBe("Tom Dale (New York) at LinkedIn");

    organization.set("Linked[in]");

    expect(complete.current).toBe("Tom Dale (New York) at Linked[in]");
  });
});

test("Formula using cells", () => {
  class Person {
    #name: Cell<string>;
    #country: Cell<string>;

    constructor(name: string, country: string) {
      this.#name = Cell(name);
      this.#country = Cell(country);
    }

    get name() {
      return this.#name.current;
    }

    set name(value: string) {
      this.#name.set(value);
    }

    get country() {
      return this.#country.current;
    }
    set country(value: string) {
      this.#country.set(value);
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
  let counter = 0;

  const formatted = FormulaFn(() => {
    counter++;
    return person.formatted(false);
  });

  expect(formatted.current).toBe("Tom");
  expect(counter).toBe(1);

  expect(formatted.current).toBe("Tom");
  expect(counter).toBe(1);

  person.name = "Thomas";

  expect(formatted.current).toBe("Thomas");
  expect(counter).toBe(2);
});

test("Formula using the @reactive decorator", () => {
  class Person {
    @reactive declare name: string;
    @reactive declare country: string;

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
  let counter = 0;

  const formatted = FormulaFn(() => {
    counter++;
    return person.formatted(false);
  });

  expect(formatted.current).toBe("Tom");
  expect(counter).toBe(1);

  expect(formatted.current).toBe("Tom");
  expect(counter).toBe(1);

  person.name = "Thomas";

  expect(formatted.current).toBe("Thomas");
  expect(counter).toBe(2);
});

test("nested Formula", () => {
  const person = testName("Tom", "Dale");

  expect(person.fullName).toBe("Tom Dale");

  person.firstName = "Thomas";

  expect(person.fullName).toBe("Thomas Dale");
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
