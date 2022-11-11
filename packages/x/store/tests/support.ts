import type { RowTypeFor, Table } from "@starbeamx/store";

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
 
function attr(target: object, propertyKey: string | symbol): void {
  if (typeof propertyKey === "symbol") {
    throw Error("an @attr decorator can only be used on a string property");
  }

  Object.defineProperty(target, propertyKey, {
    get: function (this: { row: Record<string, unknown> }) {
       
      return this.row[propertyKey];
    },
  });
}
