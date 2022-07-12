/* eslint-disable @typescript-eslint/no-unsafe-call */
import { reactive } from "@starbeam/js";
import { useProp, useReactiveSetup } from "@starbeam/react";
import type { FormEvent } from "react";

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

  append(row: T) {
    this.#rows.set(`${this.#id++}`, row);
  }

  delete(id: string) {
    this.#rows.delete(id);
  }
}

export default function Database(props: { locale: string }) {
  const locale = useProp(props.locale, "locale");

  return useReactiveSetup(() => {
    const people = new Table<Person>(["name", "location"]);

    function append(event: FormEvent<HTMLFormElement>) {
      const form = event.currentTarget;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form)) as {
        name: string;
        location: string;
      };

      people.append(data);
      form.reset();
    }

    function sorted() {
      return people.rows.sort((a, b) =>
        new Intl.Collator(locale.current).compare(a[1].name, b[1].name)
      );
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
            {sorted().map(([id, person]) => (
              <tr key={id}>
                <td>{person.name}</td>
                <td>{person.location}</td>
                <td className="actions">
                  <button onClick={() => people.delete(id)}>✂️</button>
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
  });
}
