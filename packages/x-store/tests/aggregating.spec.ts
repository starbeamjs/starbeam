import { Cell, FormulaFn } from "@starbeam/core";
import { isPresent, verified } from "@starbeam/verify";
import { type Aggregator, Average, Sum, Table } from "@starbeamx/store";
import { describe, expect, test } from "vitest";

import type { Person } from "./data.js";

describe("aggregating tables", () => {
  const data: readonly Person[] = [
    {
      id: "1",
      name: "Howard Runolfsson",
      age: 23,
      visits: 518,
      status: "active",
    },
    {
      id: "2",
      name: "Dorothy Satterfield",
      age: 21,
      visits: 432,
      status: "inactive",
    },
    {
      id: "3",
      name: "Jack Connelly",
      age: 42,
      visits: 956,
      status: "active",
    },
    {
      id: "4",
      name: "Justin Turner",
      age: 25,
      visits: 174,
      status: "active",
    },
    {
      id: "5",
      name: "Dominick Bosco",
      age: 64,
      visits: 622,
      status: "active",
    },
  ] as const;

  const people = Table.create<Person>({
    columns: ["name", "age", "visits", "status"],
  });

  people.append(...data);

  test("a table's cells can be aggregated", () => {
    // A list of rows can be aggregated by specifying the aggregation for each column.
    //
    // Any unspecified columns are ignored. You can combine grouping and aggregation to get
    // aggregate rows for groups.

    expect(
      people.aggregateBy({
        age: Sum,
        visits: Sum,
      }).row
    ).toEqual({
      id: "aggregate:1,2,3,4,5",
      age: 23 + 21 + 42 + 25 + 64,
      visits: 518 + 432 + 956 + 174 + 622,
    });

    expect(
      people.aggregateBy({
        age: Average,
        visits: Sum,
      }).row
    ).toEqual({
      id: "aggregate:1,2,3,4,5",
      age: (23 + 21 + 42 + 25 + 64) / 5,
      visits: 518 + 432 + 956 + 174 + 622,
    });
  });

  test("aggregates are reactive", () => {
    const people = Table.create<Person>({
      columns: ["name", "age", "visits", "status"],
    });

    people.append(...data);

    const averageAge = FormulaFn(() => {
      const average = people.aggregateBy({
        age: Average,
      });

      return average.row.age;
    });

    const totalVisits = FormulaFn(() => {
      const total = people.aggregateBy({
        visits: Sum,
      });

      return total.row.visits;
    });

    expect(averageAge.current).toEqual((23 + 21 + 42 + 25 + 64) / 5);
    expect(totalVisits.current).toEqual(518 + 432 + 956 + 174 + 622);

    people.append({
      id: "6",
      name: "John Doe",
      age: 42,
      visits: 956,
      status: "active",
    });

    expect(averageAge.current).toEqual((23 + 21 + 42 + 25 + 64 + 42) / 6);
    expect(totalVisits.current).toEqual(518 + 432 + 956 + 174 + 622 + 956);
  });

  test("groups can be aggregated", () => {
    const byStatus = people.groupBy((row) => ({ bucket: row.status }));

    const groups = byStatus.groups;

    expect(groups.size).toEqual(2);

    const inactive = verified(groups.get("inactive"), isPresent);

    expect(inactive.aggregateBy({ age: Sum }).row).toEqual({
      id: "aggregate:2",
      age: 21,
    });

    expect(inactive.aggregateBy({ visits: Sum, age: Average }).row).toEqual({
      id: "aggregate:2",
      age: 21,
      visits: 432,
    });

    const active = verified(groups.get("active"), isPresent);

    expect(active.aggregateBy({ age: Sum }).row).toEqual({
      id: "aggregate:1,3,4,5",
      age: 23 + 42 + 25 + 64,
    });

    expect(active.aggregateBy({ visits: Sum, age: Average }).row).toEqual({
      id: "aggregate:1,3,4,5",
      age: (23 + 42 + 25 + 64) / 4,
      visits: 518 + 956 + 174 + 622,
    });
  });

  test("aggregated groups are reactive", () => {
    const people = Table.create<Person>({
      columns: ["name", "age", "visits", "status"],
    });

    people.append(...data);

    const aggregate = Cell(Sum as Aggregator<number>);

    const activeVisits = FormulaFn(() => {
      const byStatus = people.groupBy((row) => ({ bucket: row.status }));

      const active = verified(byStatus.groups.get("active"), isPresent);
      return active.aggregateBy({ visits: aggregate.current }).row.visits;
    });

    expect(activeVisits.current).toEqual(518 + 956 + 174 + 622);

    aggregate.set(Average);

    expect(activeVisits.current).toEqual((518 + 956 + 174 + 622) / 4);

    people.append({
      id: "6",
      name: "John Doe",
      age: 42,
      visits: 956,
      status: "active",
    });

    expect(activeVisits.current).toEqual((518 + 956 + 174 + 622 + 956) / 5);
  });
});
