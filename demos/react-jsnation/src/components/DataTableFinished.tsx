import { Cell } from "@starbeam/core";
import { useReactiveSetup } from "@starbeam/react";
import type { FormEvent } from "react";

import { type Person, People } from "../lib/people.js";
import { Table } from "../lib/table.js";
import { SYSTEM_LOCALE } from "./intl.js";

export default function () {
  return useReactiveSetup(() => {
    const table = new Table<Person>(["name", "location"]);

    table.append({ name: "Tom Dale", location: "NYC" });
    table.append({ name: "Chirag Patel", location: "NYC" });
    table.append({ name: "Yehuda Katz", location: "Portland" });
    table.append({ name: "Ärne Ärni", location: "Germany" });

    const people = new People(table);

    function append(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();

      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form)) as {
        name: string;
        location: string;
      };

      table.append(data);
      form.reset();
    }

    const filter = Cell("");

    function query() {
      return people.filter(filter.current).sort("name", SYSTEM_LOCALE);
    }

    function total() {
      const filteredCount = query().rows.length;
      const totalCount = table.rows.length;

      if (filteredCount === totalCount) {
        return `items: ${totalCount}`;
      } else {
        return `items: ${filteredCount} filtered / ${totalCount}`;
      }
    }

    return () => {
      return (
        <>
          <details>
            <summary>Create a new user</summary>
            <form onSubmit={append}>
              <label>
                <span>Name*</span>
                <input type="text" name="name" required />
                <span data-field="name" />
              </label>
              <label>
                <span>Location*</span>
                <input type="text" name="location" required />
                <span data-field="location" />
              </label>
              <label>
                <button type="submit">append</button>
              </label>
            </form>
          </details>
          <label>
            <span>Filter</span>
            <input
              type="text"
              defaultValue={filter.current}
              onInput={(e) => filter.set(e.currentTarget.value)}
            />
          </label>
          <table>
            <thead>
              <tr>
                {table.columns.map((p) => (
                  <th key={p}>{p}</th>
                ))}
                <th className="action">
                  <button onClick={() => table.clear()}>✂️</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {query().rows.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.location}</td>
                  <td className="actions">
                    <button onClick={() => table.delete(person.id)}>✂️</button>
                  </td>
                </tr>
              ))}

              <tr className="summary" data-items={people.rows.length}>
                <td colSpan={3}>{total()}</td>
              </tr>
            </tbody>
          </table>
        </>
      );
    };
  });
}
