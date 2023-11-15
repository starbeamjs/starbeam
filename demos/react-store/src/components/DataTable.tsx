import { setup, useProp, useReactive } from "@starbeam/react";
import { Cell } from "@starbeam/universal";
import { Table } from "@starbeamx/store";
import type { FormEvent } from "react";

import { People, type Person } from "../lib/people.js";

export default function (props: { locale: string }): JSX.Element {
  const locale = useProp(props.locale, "props.locale");

  const { people, append, filter, total, rows, table } = setup(() => {
    const table = Table.create<Person>({
      columns: ["name", "location"],
      name: "people",
    });

    table.append({ name: "Tom Dale", location: "NYC" });
    table.append({ name: "Chirag Patel", location: "NYC" });
    table.append({ name: "Yehuda Katz", location: "Portland" });
    table.append({ name: "Ärne Ärni", location: "Germany" });

    const people = new People(table);

    function append(e: FormEvent<HTMLFormElement>): void {
      e.preventDefault();

      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form)) as {
        name: string;
        location: string;
      };

      table.append(data);
      form.reset();
    }

    const filter = Cell("", "filter");

    const query = (): People =>
      people.filter(filter.current).sort("name", locale.read());

    function rows(): (Person & { id: string })[] {
      return query().rows;
    }

    function total(): string {
      const filteredCount = rows().length;
      const totalCount = table.rows.length;

      if (filteredCount === totalCount) {
        return `items: ${totalCount}`;
      } else {
        return `items: ${filteredCount} filtered / ${totalCount} total`;
      }
    }

    return {
      append,
      filter,
      total,
      rows,
      people,
      table,
    };
  });

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
          defaultValue={useReactive(filter)}
          onInput={(e) => filter.set(e.currentTarget.value)}
        />
      </label>
      <table>
        <thead>
          <tr>
            {useReactive(() => table.columns, [table]).map((p) => (
              <th key={p}>{p}</th>
            ))}
            <th className="action">
              <button
                onClick={() => {
                  table.clear();
                }}
              >
                ✂️
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {useReactive(rows, []).map((person) => (
            <tr key={person.id}>
              <td>{person.name}</td>
              <td>{person.location}</td>
              <td className="actions">
                <button
                  onClick={() => {
                    table.delete(person.id);
                  }}
                >
                  ✂️
                </button>
              </td>
            </tr>
          ))}

          <tr className="summary" data-items={people.rows.length}>
            <td colSpan={3}>{useReactive(total, [])}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
