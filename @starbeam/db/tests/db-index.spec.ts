import { reactive } from "@starbeam/core";
import { Formula } from "@starbeam/reactive";
import { isPresent, verified } from "@starbeam/verify";
import {
  Database,
  Row,
  Table,
  type Reference,
  type RowType,
} from "../index.js";

interface Person {
  name: string;
  location: Reference<LocationType>;
  contacts: Reference<ContactType>[];
}

interface Contact {
  phone: string;
}

interface Location {
  city: string | null;
  country: string;
}

type PersonType = RowType<"people", Person>;
type LocationType = RowType<"locations", Location>;
type ContactType = RowType<"contacts", Contact>;

test("indexing a table", async () => {
  const locations = Table.define<Location>().named("locations");

  const newYork = locations.create("1", {
    city: "New York",
    country: "USA",
  });

  const people = Table.define<Person>()
    .named("people")
    .define.index("new york", (person) => {
      const location = person.columns.location.row;
      return location?.id === newYork.id;
    });

  const contacts = Table.define<Contact>().named("contacts");

  const db = Database.create().add(people).add(locations).add(contacts);

  const tom = people.create("1", {
    name: "Tom",
    location: newYork.reference,
    contacts: reactive([]),
  });

  const peopleInNewYork = Formula(() => people.queryBy({ "new york": true }));

  const person = peopleInNewYorkFor(db);

  expect(person.map((p) => p.id)).toEqual(["1"]);

  const nyNumbers = Formula(() =>
    [...peopleInNewYork.current].flatMap((p) => contactsFor(db, p.id))
  );

  const contactsForTom = Formula(() => contactsFor(db, tom.id));

  // assert that contactsFor Tom is empty
  expect(contactsFor(db, "1")).toEqual([]);
  expect(contactsForTom.current).toEqual([]);
  expect(nyNumbers.current).toEqual([]);

  tom.mutate((draft) => {
    const contact = contacts.create("1", {
      phone: "555-1234",
    });
    draft.columns.contacts.push(contact.reference);
  });

  expect(contactsFor(db, "1").map((c) => c.columns.phone)).toEqual([
    "555-1234",
  ]);
  expect(contactsForTom.current.map((c) => c.columns.phone)).toEqual([
    "555-1234",
  ]);
  // expect(
  //   [...peopleInNewYork.current].map((p) => {
  //     console.log(p.columns);
  //     return p.columns.name;
  //   })
  // ).toEqual(["Tom"]);
  // expect(nyNumbers.current.map((c) => c.columns.phone)).toEqual(["555-1234"]);

  // const abie = people.create("2", {
  //   name: "Abie",
  //   location: locations.reference("1"),
  //   contacts: reactive([]),
  // });

  // // assert that the phone number list in nyNumbers hasn't changed
  // expect(nyNumbers.current.map((c) => c.columns.phone)).toEqual(["555-1234"]);

  // // add a number to abie
  // abie.mutate((draft) => {
  //   const contact = contacts.create("2", {
  //     phone: "555-5678",
  //   });
  //   draft.columns.contacts.push(contact.reference);
  // });

  // // assert that the phone number list now has Abie's number
  // expect(nyNumbers.current.map((c) => c.columns.phone)).toEqual([
  //   "555-1234",
  //   "555-5678",
  // ]);
});

type DB = Database<{
  people: PersonType;
  locations: LocationType;
  contacts: ContactType;
}>;

function peopleInNewYorkFor(db: DB): Row<PersonType, string>[] {
  return [
    ...db.query(({ people, locations }) => {
      const ny = verified(locations.get("1"), isPresent);

      return people.query((person) => person.columns.location.equals(ny));
    }),
  ];
}

function contactsFor(db: DB, personId: string): Row<ContactType>[] {
  return [
    ...db
      .query(({ people, contacts }) => {
        const person = verified(people.get(personId), isPresent);

        return person.columns.contacts.map((contact) =>
          verified(contact.row, isPresent)
        );
      })
      .flat(),
  ];
}

export {};

