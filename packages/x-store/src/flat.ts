import type {
  AggregateRow,
  AggregatorFor,
  AggregatorInstance,
} from "./aggregate.js";
import { type FilterInstance, Filter } from "./filter.js";
import type { TableTypes, TableTypesFor, UserTypes } from "./table.js";

export type TableRows<U extends UserTypes> = FlatRows<U>;

export abstract class FlatRows<U extends UserTypes>
  implements Iterable<TableTypesFor<U>["Row"]>
{
  abstract readonly rows: readonly TableTypesFor<U>["Row"][];

  filter(filter: Filter<U>): Query<U> {
    return new Query<U>(this, Filter(filter), undefined);
  }

  sort(sort: SortFn<U>): Query<U> {
    return new Query<U>(this, Filter.unfiltered(), sort);
  }

  groupBy<Bucket, Description>(
    groupBy: Grouping<U, Bucket, Description>
  ): GroupBy<U, Bucket, Description> {
    return GroupBy.create<U, Bucket, Description>(this, groupBy);
  }

  aggregateBy<A extends AggregatorFor<U>>(aggregateBy: A): AggregateBy<U, A> {
    return AggregateBy.create(this, aggregateBy);
  }

  [Symbol.iterator](): IterableIterator<TableTypesFor<U>["Row"]> {
    return this.rows[Symbol.iterator]();
  }
}

/**
 * `Group` is in here because of cycles
 */

interface Grouping<U extends UserTypes, Bucket, Description> {
  (row: TableTypesFor<U>["Row"]): { bucket: Bucket; as?: Description };
}

export class Group<T extends TableTypes> extends FlatRows<T> {
  static empty<T extends TableTypes>(
    grouping: unknown,
    description: unknown
  ): Group<T> {
    return new Group(grouping, description, []);
  }

  static add<T extends TableTypes>(group: Group<T>, row: T["Row"]) {
    group.#rows.push(row);
  }

  readonly #grouping: unknown;
  readonly #description: unknown;
  readonly #rows: T["Row"][];

  constructor(grouping: unknown, description: unknown, rows: T["Row"][]) {
    super();
    this.#rows = rows;
    this.#grouping = grouping;
    this.#description = description;
  }

  get rows(): readonly T["Row"][] {
    return this.#rows;
  }
}

export class Groups<T extends TableTypes, Description> {
  static empty<T extends TableTypes, Description>(): Groups<T, Description> {
    return new Groups<T, Description>(new Map());
  }

  static add<T extends TableTypes, Bucket, Description>(
    groups: Groups<T, Description>,
    bucket: Bucket,
    description: Description,
    row: T["Row"]
  ): void {
    let group = groups.#map.get(description);

    if (!group) {
      group = Group.empty(bucket, description);
      groups.#map.set(description, group);
    }

    Group.add(group, row);
  }

  #map: Map<Description, Group<T>>;

  private constructor(map: Map<Description, Group<T>>) {
    this.#map = map;
  }

  get size(): number {
    return this.#map.size;
  }

  get(key: Description): Group<T> | undefined {
    return this.#map.get(key);
  }
}

export class GroupBy<U extends UserTypes, Bucket, Description> {
  static create<U extends UserTypes, Bucket, Description>(
    rows: FlatRows<U>,
    groupBy: Grouping<TableTypesFor<U>, Bucket, Description>
  ): GroupBy<U, Bucket, Description> {
    return new GroupBy(rows, groupBy);
  }

  #rows: FlatRows<U>;
  #groupBy: Grouping<TableTypesFor<U>, Bucket, Description>;

  constructor(
    rows: FlatRows<U>,
    groupBy: Grouping<TableTypesFor<U>, Bucket, Description>
  ) {
    this.#rows = rows;
    this.#groupBy = groupBy;
  }

  get groups() {
    const groups = Groups.empty<TableTypesFor<U>, Description>();

    for (const row of this.#rows.rows) {
      const { bucket, as: description = bucket } = this.#groupBy(row);
      Groups.add(groups, bucket, description, row);
    }

    return groups;
  }
}

/**
 * `Aggregate` is also in here because of cycles
 */

type Dict = Record<string, unknown>;

export class AggregateBy<
  U extends UserTypes,
  A extends AggregatorFor<TableTypesFor<U>>
> {
  static create<U extends UserTypes, A extends AggregatorFor<TableTypesFor<U>>>(
    rows: FlatRows<U>,
    aggregateBy: A
  ): AggregateBy<U, A> {
    return new AggregateBy(rows, aggregateBy);
  }

  #rows: FlatRows<U>;
  #aggregateBy: A;

  constructor(rows: FlatRows<U>, aggregateBy: A) {
    this.#rows = rows;
    this.#aggregateBy = aggregateBy;
  }

  get row(): AggregateRow<TableTypesFor<U>, A> & { id: string } {
    const aggregators = Object.fromEntries(
      Object.entries(this.#aggregateBy).map((entry) => {
        const [key, aggregator] = entry as [
          string,
          { initialize: () => AggregatorInstance<unknown, unknown> }
        ];
        return [key, aggregator.initialize()];
      })
    ) as Record<string, AggregatorInstance<unknown, unknown>>;

    for (const row of this.#rows.rows) {
      for (const [column, aggregator] of Object.entries(aggregators)) {
        aggregator.add((row as Dict)[column]);
      }
    }

    const columns = Object.fromEntries(
      Object.entries(aggregators).map(([key, aggregator]) => [
        key,
        aggregator.value(),
      ])
    ) as unknown as AggregateRow<TableTypesFor<U>, A>[];

    return {
      id: `aggregate:${this.#rows.rows.map((row) => row.id).join(",")}`,
      ...columns,
    } as unknown as AggregateRow<TableTypesFor<U>, A> & { id: string };
  }
}

export class Query<U extends UserTypes> extends FlatRows<U> {
  static for<U extends UserTypes>(this: void, rows: FlatRows<U>): Query<U> {
    return new Query(rows, Filter.unfiltered(), undefined);
  }

  #rows: FlatRows<U>;
  #filter: FilterInstance<U>;
  #sort: SortFn<U> | undefined;

  constructor(
    rows: FlatRows<U>,
    filter: FilterInstance<U>,
    sort: SortFn<U> | undefined
  ) {
    super();
    this.#rows = rows;
    this.#filter = filter;
    this.#sort = sort;
  }

  sort(sort: SortFn<U>): Query<U> {
    return new Query(this.#rows, this.#filter, sort);
  }

  and(...filters: Filter<U>[]): Query<U> {
    return new Query(this.#rows, this.#filter.and(...filters), this.#sort);
  }

  or(...filters: Filter<U>[]): Query<U> {
    return new Query(this.#rows, this.#filter.or(...filters), this.#sort);
  }

  get rows(): TableTypesFor<U>["Row"][] {
    const table = this.#rows;
    const rows = [...table.rows];
    const filtered = rows.filter((row) => this.#filter.matches(row));

    if (this.#sort) {
      return filtered.sort(this.#sort);
    } else {
      return filtered;
    }
  }
}

type SortDirection = "asc" | "desc";

export interface Sort<T extends TableTypes> {
  by: SortFn<T>;
  direction: SortDirection;
}

export type SortFn<U extends UserTypes> = (
  a: TableTypesFor<U>["Row"],
  b: TableTypesFor<U>["Row"]
) => number;
