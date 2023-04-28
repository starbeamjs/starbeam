// import Card from "./Card.jsx";
import { useReactive, useSetup } from "@starbeam/react";
import { Formula } from "@starbeam/reactive";

import type { RowRef, Table } from "../lib/db.js";
import { Database, Row } from "../lib/db.js";

let id = 0;

export default function App(): JSX.Element {
  return useSetup(() => {
    const db = Database.create()
      .define("person", Row as Person)
      .define("contact", Row as Contact);

    function addPerson() {
      db.add("person", { id: String(id++), name: `Zoey${id}` });
    }

    return Formula(() => {
      const tables = db.tables.map((name) => (
        <>
          <button onClick={addPerson}>Add Person</button>
          <DisplayTable table={db.get(name)} />
        </>
      ));
      return <>{tables}</>;
    });
  });
}

function DisplayTable<T>({ table }: { table: Table<T> }): JSX.Element {
  return useReactive(() => (
    <>
      <h2>{table.name}</h2>
      <ul>
        <li>hi</li>
        <li>ids: [{table.refs.map((ref) => ref.id)}]</li>
      </ul>
      {table.rows.map((r) => (
        <p>{JSON.stringify(r)}</p>
      ))}
    </>
  ));
}

interface Person {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  type: string;
  value: string;
  person: RowRef<Person>;
}
