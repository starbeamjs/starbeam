import type {
  AggregateRow,
  AggregatorFor,
  AggregatorInstance,
} from "./aggregate.js";
import type { TableTypes } from "./table.js";

export abstract class FlatRows<T extends TableTypes>
  implements Iterable<T["Row"]>
{
  abstract readonly rows: readonly T["Row"][];

  groupBy<Bucket, Description>(
    groupBy: Grouping<T, Bucket, Description>
  ): GroupBy<T, Bucket, Description> {
    return GroupBy.create(this, groupBy);
  }

  aggregateBy<A extends AggregatorFor<T>>(aggregateBy: A): AggregateBy<T, A> {
    return AggregateBy.create(this, aggregateBy);
  }

  [Symbol.iterator](): IterableIterator<T["Row"]> {
    return this.rows[Symbol.iterator]();
  }
}

/**
 * `Group` is in here because of cycles
 */

interface Grouping<T extends TableTypes, Bucket, Description> {
  (row: T["Row"]): { bucket: Bucket; as?: Description };
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

export class Groups<T extends TableTypes, Bucket, Description> {
  static empty<T extends TableTypes, Bucket, Description>(): Groups<
    T,
    Bucket,
    Description
  > {
    return new Groups<T, Bucket, Description>(new Map());
  }

  static add<T extends TableTypes, Bucket, Description>(
    groups: Groups<T, Bucket, Description>,
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

export class GroupBy<T extends TableTypes, Bucket, Description> {
  static create<T extends TableTypes, Bucket, Description>(
    rows: FlatRows<T>,
    groupBy: Grouping<T, Bucket, Description>
  ): GroupBy<T, Bucket, Description> {
    return new GroupBy(rows, groupBy);
  }

  #rows: FlatRows<T>;
  #groupBy: Grouping<T, Bucket, Description>;

  constructor(rows: FlatRows<T>, groupBy: Grouping<T, Bucket, Description>) {
    this.#rows = rows;
    this.#groupBy = groupBy;
  }

  get groups() {
    const groups = Groups.empty<T, Bucket, Description>();

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

export class AggregateBy<T extends TableTypes, A extends AggregatorFor<T>> {
  static create<T extends TableTypes, A extends AggregatorFor<T>>(
    rows: FlatRows<T>,
    aggregateBy: A
  ): AggregateBy<T, A> {
    return new AggregateBy(rows, aggregateBy);
  }

  #rows: FlatRows<T>;
  #aggregateBy: A;

  constructor(rows: FlatRows<T>, aggregateBy: A) {
    this.#rows = rows;
    this.#aggregateBy = aggregateBy;
  }

  get row(): AggregateRow<T, A> & { id: string } {
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
    ) as unknown as AggregateRow<T, A>[];

    return {
      id: `aggregate:${this.#rows.rows.map((row) => row.id).join(",")}`,
      ...columns,
    } as AggregateRow<T, A> & { id: string };
  }
}
