import { Formula } from "@starbeam/universal";
import { Query, Table } from "@starbeamx/store";
import { describe, expect, test } from "vitest";

import { type Person, PersonModel } from "./support.js";

describe("queries", () => {
  test("it should be possible to filter a table", () => {
    const people = Table.create<Person>({ columns: ["name", "location"] });

    people.append({ name: "John", location: "Berlin" });
    people.append({ name: "Jane", location: "London" });

    const johnInBerlinQuery = Query.for(people)
      .filter(({ name }) => name === "John")
      .and(({ location }) => location === "Berlin");

    const berlinQuery = Query.for(people).filter(
      ({ location }) => location === "Berlin"
    );

    const jNames = Query.for(people).filter(({ name }) => name.startsWith("J"));

    const johnOrBerlinQuery = Query.for(people)
      .filter(({ name }) => name === "John")
      .or(({ location }) => location === "Berlin");

    expect(johnInBerlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
    ]);

    expect(berlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
    ]);

    expect(johnOrBerlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
    ]);

    expect(jNames.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "1", name: "Jane", location: "London" },
    ]);

    people.append({ name: "Tom", location: "Berlin" });

    expect(johnInBerlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
    ]);

    expect(berlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "2", name: "Tom", location: "Berlin" },
    ]);

    expect(johnOrBerlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "2", name: "Tom", location: "Berlin" },
    ]);

    expect(jNames.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "1", name: "Jane", location: "London" },
    ]);

    people.append({ name: "Jim", location: "Portland" });

    expect(johnInBerlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
    ]);

    expect(berlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "2", name: "Tom", location: "Berlin" },
    ]);

    expect(johnOrBerlinQuery.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "2", name: "Tom", location: "Berlin" },
    ]);

    expect(jNames.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "1", name: "Jane", location: "London" },
      { id: "3", name: "Jim", location: "Portland" },
    ]);
  });

  test("a query should invalidate correctly inside a formula", () => {
    const people = Table.create<Person>({ columns: ["name", "location"] });

    function card(person: Person): string {
      return `${person.name} (in ${person.location})`;
    }

    function cards(people: Person[]): string {
      return people.map((person) => `<p>${card(person)}</p>`).join("");
    }

    people.append({ name: "John", location: "Berlin" });
    people.append({ name: "Jane", location: "London" });

    const johnInBerlinQuery = Query.for(people)
      .filter(({ name }) => name === "John")
      .and(({ location }) => location === "Berlin");

    const johnInBerlin = Formula(() => cards(johnInBerlinQuery.rows));

    const berlinQuery = Query.for(people).filter(
      ({ location }) => location === "Berlin"
    );

    const berliners = Formula(() => cards(berlinQuery.rows));

    const jNamesQuery = Query.for(people).filter(({ name }) =>
      name.startsWith("J")
    );

    const jNames = Formula(() => cards(jNamesQuery.rows));

    const johnOrBerlinQuery = Query.for(people)
      .filter(({ name }) => name === "John")
      .or(({ location }) => location === "Berlin");

    const johnsAndBerliners = Formula(() => cards(johnOrBerlinQuery.rows));

    expect(johnInBerlin.current).toEqual("<p>John (in Berlin)</p>");
    expect(berliners.current).toEqual("<p>John (in Berlin)</p>");
    expect(jNames.current).toEqual(
      "<p>John (in Berlin)</p><p>Jane (in London)</p>"
    );
    expect(johnsAndBerliners.current).toEqual("<p>John (in Berlin)</p>");

    people.append({ name: "Tom", location: "Berlin" });

    expect(johnInBerlin.current).toEqual("<p>John (in Berlin)</p>");
    expect(berliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );
    expect(jNames.current).toEqual(
      "<p>John (in Berlin)</p><p>Jane (in London)</p>"
    );
    expect(johnsAndBerliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );

    people.append({ name: "Jim", location: "Portland" });

    expect(johnInBerlin.current).toEqual("<p>John (in Berlin)</p>");
    expect(berliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );
    expect(jNames.current).toEqual(
      "<p>John (in Berlin)</p><p>Jane (in London)</p><p>Jim (in Portland)</p>"
    );
    expect(johnsAndBerliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );
  });

  test("queries work with models", () => {
    const people = Table.create({
      columns: ["name", "location"],
      model: PersonModel.create,
    });

    people.append({ name: "John", location: "Berlin" });

    function card(person: Person): string {
      return `${person.name} (in ${person.location})`;
    }

    function cards(people: Person[]): string {
      return people.map((person) => `<p>${card(person)}</p>`).join("");
    }

    people.append({ name: "Jane", location: "London" });

    const johnInBerlinQuery = Query.for(people)
      .filter(({ name }) => name === "John")
      .and(({ location }) => location === "Berlin");

    const johnInBerlin = Formula(() => cards(johnInBerlinQuery.rows));

    const berlinQuery = Query.for(people).filter(
      ({ location }) => location === "Berlin"
    );

    const berliners = Formula(() => cards(berlinQuery.rows));

    const jNamesQuery = Query.for(people).filter(({ name }) =>
      name.startsWith("J")
    );

    const jNames = Formula(() => cards(jNamesQuery.rows));

    const johnOrBerlinQuery = Query.for(people)
      .filter(({ name }) => name === "John")
      .or(({ location }) => location === "Berlin");

    const johnsAndBerliners = Formula(() => cards(johnOrBerlinQuery.rows));

    expect(johnInBerlin.current).toEqual("<p>John (in Berlin)</p>");
    expect(berliners.current).toEqual("<p>John (in Berlin)</p>");
    expect(jNames.current).toEqual(
      "<p>John (in Berlin)</p><p>Jane (in London)</p>"
    );
    expect(johnsAndBerliners.current).toEqual("<p>John (in Berlin)</p>");

    people.append({ name: "Tom", location: "Berlin" });

    expect(johnInBerlin.current).toEqual("<p>John (in Berlin)</p>");
    expect(berliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );
    expect(jNames.current).toEqual(
      "<p>John (in Berlin)</p><p>Jane (in London)</p>"
    );
    expect(johnsAndBerliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );

    people.append({ name: "Jim", location: "Portland" });

    expect(johnInBerlin.current).toEqual("<p>John (in Berlin)</p>");
    expect(berliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );
    expect(jNames.current).toEqual(
      "<p>John (in Berlin)</p><p>Jane (in London)</p><p>Jim (in Portland)</p>"
    );
    expect(johnsAndBerliners.current).toEqual(
      "<p>John (in Berlin)</p><p>Tom (in Berlin)</p>"
    );
  });
});
