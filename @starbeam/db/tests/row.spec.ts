import { Formula } from "@starbeam/reactive";
import { Table } from "../index.js";

interface Person {
  name: string;
  location: string;
}

test("An existing row", () => {
  const table = Table.define<Person>().named("people");

  const row = table.create("tomdale", {
    name: "tomdale",
    location: "Portland",
  });

  const card = Formula(() => {
    const { name, location } = row.columns;
    return `${name} (${location})`;
  });

  expect(row.columns).toMatchObject({ name: "tomdale", location: "Portland" });
  expect(card.current).toBe(`tomdale (Portland)`);

  const draft = row.draft;

  draft.mutate.name = "@tomdale";

  expect(row.columns).toMatchObject({ name: "tomdale", location: "Portland" });
  expect(card.current).toBe(`tomdale (Portland)`);

  draft.commit();

  expect(row.columns).toMatchObject({ name: "@tomdale", location: "Portland" });
  expect(card.current).toBe(`@tomdale (Portland)`);
});

test("Creating a new row", () => {});

export {};
