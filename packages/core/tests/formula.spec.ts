import { Cell, Formula } from "@starbeam/core";
import { describe, expect, test } from "vitest";

describe("A reactive formula", () => {
  test("can be validated", () => {
    const name = Cell("@tomdale");
    const location = Cell("New York");

    const card = Formula(() => `${name.current} (${location.current})`);

    expect(card.current).toBe("@tomdale (New York)");

    name.set("Tom Dale");

    expect(card.current).toBe("Tom Dale (New York)");
  });

  test("produces stable values if inputs don't change", () => {
    const name = Cell("@tomdale");
    const location = Cell("New York");

    const card = Formula(() => ({
      name: name.current,
      location: location.current,
    }));

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

    const card = Formula(() => ({
      name: name.current,
      location: location.current,
    }));

    let last = card.current;

    expect(last).toEqual({
      name: "@tomdale",
      location: "New York",
    });

    expect(card.current).toBe(last);

    // set the name to the same value
    name.set("@tomdale");

    let next = card.current;

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
      (a, b) => a.name === b.name && a.location === b.location
    );

    const card = Formula(() => ({
      name: person.current.name,
      location: person.current.location,
    }));

    let lastCard = card.current;
    let lastPerson = person.current;

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

    let nextCard = card.current;
    let nextPerson = person.current;

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

    const card = Formula(() => `${name.current} (${location.current})`);
    const complete = Formula(
      () => `${card.current} at ${organization.current}`
    );

    expect(complete.current).toBe("@tomdale (New York) at LinkedIn");

    name.set("Tom Dale");

    expect(complete.current).toBe("Tom Dale (New York) at LinkedIn");

    organization.set("Linked[in]");

    expect(complete.current).toBe("Tom Dale (New York) at Linked[in]");
  });
});
