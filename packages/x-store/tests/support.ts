import type { Table } from "@starbeamx/store";

import type { RowTypeFor } from "../src/table.js";

export interface Person {
  name: string;
  location: string;
}

export class People {
  #table: Table<Person>;

  constructor(table: Table<Person>) {
    this.#table = table;
  }

  get rows(): RowTypeFor<Person>[] {
    return this.#table.rows;
  }
}

export class PersonModel {
  static create(this: void, id: string, row: Person): PersonModel {
    return new PersonModel(id, row);
  }

  constructor(readonly id: string, readonly row: Person) {}

  @attr declare name: string;
  @attr declare location: string;
}

// the attr field decorator returns the value of the property in the `row` property of the target
// object
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function attr(target: object, propertyKey: string | symbol) {
  if (typeof propertyKey === "symbol") {
    throw Error("an @attr decorator can only be used on a string property");
  }

  Object.defineProperty(target, propertyKey, {
    get: function (this: { row: Record<string, unknown> }) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.row[propertyKey];
    },
  });
}
