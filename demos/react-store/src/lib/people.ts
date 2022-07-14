import type { Query, TableRows } from "@starbeamx/store";
import { Filter } from "@starbeamx/store";

export interface Person {
  name: string;
  location: string;
}

export class People {
  #table: TableRows<Person>;
  #query: Query<Person>;

  constructor(
    table: TableRows<Person>,
    query = table.filter(Filter.unfiltered())
  ) {
    this.#table = table;
    this.#query = query;
  }

  get rows(): (Person & { id: string })[] {
    return this.#query.rows;
  }

  sort(column: keyof Person, locale: string): People {
    // use Intl.Collator to sort the specified column by locale
    const collator = new Intl.Collator(locale);

    const query: Query<Person> = this.#query.sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];

      return collator.compare(aValue, bValue);
    });

    return new People(this.#table, query);
  }

  filter(text: string): People {
    const query: Query<Person> = this.#query.filter(
      (row) => row.name.includes(text) || row.location.includes(text)
    );

    return new People(this.#table, query);
  }
}
