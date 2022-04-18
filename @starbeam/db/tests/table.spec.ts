import { Formula } from "@starbeam/reactive";
import { Row, Table } from "../index.js";
import type { RowType } from "../src/table.js";

interface Person {
  name: string;
  location: string;
}

type People = RowType<"people", Person>;

test("creating a new row", () => {
  // Arrange: create a new table instance and add a new row.
  const people = Table.define<Person>().named("people");

  const peopleList = Formula(() => {
    // create a comma-separated list of people by their names
    return [...people].map((row) => row.columns.name).join(", ");
  });

  // Create a draft row.
  const chirag = people.draft("1");

  chirag.mutate.name = "Chirag";
  chirag.mutate.location = "United States";

  // assert that the table doesn't have the row yet.
  expect(people.has("1")).toBe(false);

  // assert that the list of people is empty.
  expect(peopleList.current).toBe("");

  // but assert that the draft row has the right columns.
  expect(chirag.columns.name).toBe("Chirag");
  expect(chirag.columns.location).toBe("United States");

  // Act: commit the draft row.
  const row = chirag.insert();
  people.insert(row);

  // assert that the table now has the row.
  expect(people.has("1")).toBe(true);

  // assert that the list of people now contains the new person.
  expect(peopleList.current).toBe("Chirag");

  const melanie = people.draft("2");
  melanie.mutate.name = "Melanie";
  melanie.mutate.location = "United States";

  // assert that the table doesn't have the row yet.
  expect(people.has("2")).toBe(false);

  // assert that the list of people is still the same.
  expect(peopleList.current).toBe("Chirag");

  // but assert that the draft row has the right columns.
  expect(melanie.columns.name).toBe("Melanie");
  expect(melanie.columns.location).toBe("United States");

  // Act: commit the draft row.
  const row2 = melanie.insert();
  people.insert(row2);

  // assert that the table now has the row.
  expect(people.has("2")).toBe(true);

  // assert that the list of people now contains the new person.
  expect(peopleList.current).toBe("Chirag, Melanie");
});

test("updating a row", () => {
  // Arrange: create a new table instance and add a new row.
  const people = Table.define<Person>().named("people");

  const peopleList = Formula(() => {
    // create a comma-separated list of people by their names
    return [...people].map((row) => row.columns.name).join(", ");
  });

  // Create a draft row.
  const chirag = people.draft("1");

  chirag.mutate.name = "Chirag";
  chirag.mutate.location = "United States";

  // Act: commit the draft row.
  const row = people.insert(chirag.insert());

  // assert that the list of people now contains the new person.
  expect(peopleList.current).toBe("Chirag");

  const update = row.draft;
  update.mutate.name = "Chirag Patel";

  // assert that the list of people is still the same.
  expect(peopleList.current).toBe("Chirag");

  // but assert that the draft row has the right columns.
  expect(update.columns.name).toBe("Chirag Patel");

  // commit the update.
  update.commit();

  // assert that the list of people is now updated with Chirag's new name.
  expect(peopleList.current).toBe("Chirag Patel");
});

test("delete a row", () => {
  // Arrange: create a new table instance and add a new row.
  const people = Table.define<Person>().named("people");

  const peopleList = Formula(() => {
    // create a comma-separated list of people by their names
    return [...people].map((row) => row.columns.name).join(", ");
  });

  // Create a draft row.
  const chirag = people.draft("1");

  chirag.mutate.name = "Chirag";
  chirag.mutate.location = "United States";

  // Act: commit the draft row.
  const row = people.insert(chirag.insert());

  // assert that the list of people now contains the new person.
  expect(peopleList.current).toBe("Chirag");

  // delete the row.
  people.delete(row);

  // assert that the list of people is now empty.
  expect(peopleList.current).toBe("");
});

/**
 * TestPeopleTable creates a table for the Person type. It provides
 * facilities for creating, updating, and deleting rows as well as two
 * formulas that return the list of people and the list of people's names.
 */
class TestPeopleTable {
  #table = Table.define<Person>().named("people");

  readonly commaSeparated = Formula(() => {
    // create a comma-separated list of people by their names
    return [...this.#table].map((row) => row.columns.name).join(", ");
  });

  readonly names = Formula(() => {
    // create a comma-separated list of people by their names
    return [...this.#table].map((row) => row.columns.name);
  });

  // a formula that filters the people list by people beginning with J
  readonly peopleStartingWithJ = Formula(() => {
    return [...this.#table].filter((row) => row.columns.name.startsWith("J"));
  });

  create(id: string, person: Person) {
    const row = this.#table.draft(id);
    row.mutate.name = person.name;
    row.mutate.location = person.location;
    return this.#table.insert(row.insert());
  }

  update(row: Row<RowType<"people", Person>>) {
    const update = row.draft;
    update.mutate.name = row.columns.name;
    update.mutate.location = row.columns.location;
    update.commit();
  }

  delete(row: Row<People>) {
    this.#table.delete(row);
  }
}

test("filtered rows", () => {
  // Arrange: create a new table instance and add a new row.
  const people = Table.define<Person>().named("people");

  const peopleList = Formula(() => {
    // create a comma-separated list of people by their names
    return [...people].map((row) => row.columns.name).join(", ");
  });

  // create a formula that filters the people based on whether their name starts with "J"
  const peopleStartingWithJ = Formula(() => {
    return [...people].filter((row) => row.columns.name.startsWith("J"));
  });

  // Create a draft row.
  const chirag = people.draft("1");

  chirag.mutate.name = "Chirag";
  chirag.mutate.location = "United States";

  // Act: commit the draft row.
  const row = people.insert(chirag.insert());

  // assert that the list of people now contains the new person.
  assertPeopleList(["Chirag"]);

  // assert that the list of people starting with J is empty.
  expect(peopleStartingWithJ.current.length).toBe(0);

  // create a new row.
  const melanie = people.draft("2");

  melanie.mutate.name = "Melanie";
  melanie.mutate.location = "United States";

  // Act: commit the draft row.
  const row2 = people.insert(melanie.insert());

  // assert that the list of people now contains the new person.
  assertPeopleList(["Chirag", "Melanie"]);

  // assert that the list of people starting with J does not contain the new person.
  assertPeopleStartingWithJ([]);

  // create a new row.
  const james = people.draft("3");

  james.mutate.name = "James";
  james.mutate.location = "United States";

  // assert that the list of people starting with J does not contain the new
  // person while James is still a draft.
  assertPeopleStartingWithJ([]);

  // Act: commit the draft row.
  const row3 = people.insert(james.insert());

  // assert that the list of people starting with J now contains "James"
  assertPeopleStartingWithJ(["James"]);

  // assert that the list of people now contains the new person.
  assertPeopleList(["Chirag", "Melanie", "James"]);

  // create a new row.
  const jane = people.draft("4");

  jane.mutate.name = "Jane";
  jane.mutate.location = "United States";

  // Act: commit the draft row.
  const row4 = people.insert(jane.insert());

  // assert that the list of people starting with J now contains "Jane"
  assertPeopleStartingWithJ(["James", "Jane"]);

  // assert that the list of people now contains the new person.
  assertPeopleList(["Chirag", "Melanie", "James", "Jane"]);

  // a function that asserts the exact contents of the peopleList.
  function assertPeopleList(expected: string[]): void {
    expect(peopleList.current).toBe(expected.join(", "));
  }

  // a function that asserts the exact contents of the peopleStartingWithJ list.
  function assertPeopleStartingWithJ(list: string[]): void {
    expect(peopleStartingWithJ.current.length).toBe(list.length);

    for (let i = 0; i < list.length; i++) {
      expect(peopleStartingWithJ.current[i].columns.name).toBe(list[i]);
    }
  }
});
