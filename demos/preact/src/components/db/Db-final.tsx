import { reactive } from "@starbeam/collections";
import { setup } from "@starbeam/preact";
import type { JSX } from "preact/jsx-runtime";

import type { EventHandler } from "../../utils.js";

interface Person {
  name: string;
  location: string;
}

class Table<T> {
  #rows: Map<string, T> = reactive.Map("rows");
  #id = 0;

  constructor(readonly columns: string[]) {}

  get rows(): [string, T][] {
    return [...this.#rows.entries()];
  }

  append(row: T): void {
    this.#rows.set(`${this.#id++}`, row);
  }

  delete(id: string): void {
    this.#rows.delete(id);
  }
}

export default function Database({ locale }: { locale: string }): JSX.Element {
  const people = setup(() => new Table<Person>(["name", "location"]));

  const append: EventHandler<HTMLFormElement, "onSubmit"> = (event) => {
    const form = event.currentTarget;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form)) as {
      name: string;
      location: string;
    };

    people.append(data);
    form.reset();
  };

  function sorted(): [string, Person][] {
    return people.rows.sort((a, b) =>
      new Intl.Collator(locale).compare(a[1].name, b[1].name)
    );
  }

  return (
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
          {sorted().map(([id, person]) => (
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
}
