import { reactive } from "@starbeam/collections";
import { useSetup } from "@starbeam/react";
import type { FormEvent } from "react";

interface Person {
  name: string;
  location: string;
}

class Table<T> {
  #rows: Record<string, T> = reactive.object({}, "rows");
  #id = 0;

  constructor(readonly columns: string[]) {}

  get rows(): [string, T][] {
    return Object.entries(this.#rows);
  }

  append(row: T): void {
    this.#rows[`${this.#id++}`] = row;
  }

  delete(id: string): void {
    delete this.#rows[id];
  }
}

export default function Database(): JSX.Element {
  return useSetup(() => {
    const people = new Table<Person>(["name", "location"]);

    function append(event: FormEvent<HTMLFormElement>): void {
      const form = event.currentTarget;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form)) as {
        name: string;
        location: string;
      };

      people.append(data);
      form.reset();
    }

    return () => (
      <>
        <form onSubmit={append}>
          <label>
            <span>Name*</span>
            <input type="text" name="name" required />
            <span data-field="name"></span>
          </label>
          <label>
            <span>Location*</span>
            <input type="text" name="location" required />
            <span data-field="location"></span>
          </label>
          <label>
            <button type="submit">append</button>
          </label>
        </form>
        <table>
          <thead>
            {people.rows.length === 0 ? null : (
              <tr>
                {people.columns.map((p) => (
                  <th key={p}>{p}</th>
                ))}
                <th className="actions">&nbsp;</th>
              </tr>
            )}
          </thead>
          <tbody>
            {people.rows.map(([id, person]) => (
              <tr key={id}>
                <td>{person.name}</td>
                <td>{person.location}</td>
                <td className="actions">
                  <button
                    onClick={() => {
                      people.delete(id);
                    }}
                  >
                    ✂️
                  </button>
                </td>
              </tr>
            ))}

            <tr className="summary" data-items={people.rows.length}>
              <td colSpan={3}>items: {people.rows.length}</td>
            </tr>
          </tbody>
        </table>
      </>
    );
  }).compute();
}
