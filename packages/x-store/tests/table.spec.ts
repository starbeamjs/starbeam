import { Formula } from "@starbeam/core";
import { Table } from "@starbeamx/store";
import { describe, expect, test } from "vitest";

import { type Person, PersonModel } from "./support.js";

describe("tables", () => {
  test("a table knows it column names", () => {
    const people = Table.create<Person>({ columns: ["name", "location"] });

    expect(people.columns).toEqual(["name", "location"]);
  });

  test("a table can append rows", () => {
    const people = Table.create<Person>({ columns: ["name", "location"] });
    const row = people.append({ name: "John", location: "Berlin" });
    expect(row).toEqual({ id: "0", name: "John", location: "Berlin" });
  });

  test("a table can append rows as models", () => {
    const people = Table.create({
      columns: ["name", "location"],
      model: PersonModel.create,
    });
    const row = people.append({ name: "John", location: "Berlin" });

    expect(row).toMatchObject({
      id: "0",
      row: { name: "John", location: "Berlin" },
    });
  });

  test("a model can use the attr decorator", () => {
    const people = Table.create({
      columns: ["name", "location"],
      model: PersonModel.create,
    });
    const row = people.append({ name: "John", location: "Berlin" });

    expect(row).toMatchObject({
      id: "0",
      name: "John",
      location: "Berlin",
    });
  });

  test("a table's rows can be enumerated", () => {
    const people = Table.create<Person>({ columns: ["name", "location"] });

    const list = Formula(() => people.rows.map(({ name }) => name).join(", "));

    people.append({ name: "John", location: "Berlin" });
    people.append({ name: "Jane", location: "London" });

    expect(people.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "1", name: "Jane", location: "London" },
    ]);

    expect(list.current).toEqual("John, Jane");

    people.append({ name: "Jack", location: "Paris" });

    expect(people.rows).toEqual([
      { id: "0", name: "John", location: "Berlin" },
      { id: "1", name: "Jane", location: "London" },
      { id: "2", name: "Jack", location: "Paris" },
    ]);

    expect(list.current).toEqual("John, Jane, Jack");

    people.delete("0");

    expect(people.rows).toEqual([
      { id: "1", name: "Jane", location: "London" },
      { id: "2", name: "Jack", location: "Paris" },
    ]);

    expect(list.current).toEqual("Jane, Jack");
  });
});
