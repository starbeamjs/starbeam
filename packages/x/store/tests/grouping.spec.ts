import { Formula } from "@starbeam/universal";
import { isPresent, verified } from "@starbeam/verify";
import { Table } from "@starbeamx/store";
import { describe, expect, test } from "vitest";

import type { Person } from "./data.js";

describe("grouping tables", () => {
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

  test("a table's data can be grouped", () => {
    const byStatus = people.groupBy((row) => ({ bucket: row.status }));

    const groups = byStatus.groups;

    expect(groups.size).toEqual(2);

    const inactive = verified(groups.get("inactive"), isPresent);

    expect([...inactive]).toEqual([
      {
        id: "2",
        name: "Dorothy Satterfield",
        age: 21,
        visits: 432,
        status: "inactive",
      },
    ]);

    const active = verified(groups.get("active"), isPresent);

    expect([...active]).toEqual([
      {
        id: "1",
        name: "Howard Runolfsson",
        age: 23,
        visits: 518,
        status: "active",
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
    ]);
  });

  test("the grouper can have an optional description", () => {
    // group by age decade
    const byAgeDecade = people.groupBy((row) => {
      const decade = Math.floor(row.age / 10);
      return { bucket: decade, as: `${decade}0s` };
    });

    const groups = byAgeDecade.groups;

    expect(groups.size).toEqual(3);

    const age20s = verified(groups.get("20s"), isPresent);

    expect([...age20s]).toEqual([
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
        id: "4",
        name: "Justin Turner",
        age: 25,
        visits: 174,
        status: "active",
      },
    ]);

    expect(groups.get("30s")).toBeUndefined();

    const age40s = verified(groups.get("40s"), isPresent);

    expect([...age40s]).toEqual([
      {
        id: "3",
        name: "Jack Connelly",
        age: 42,
        visits: 956,
        status: "active",
      },
    ]);

    expect(groups.get("50s")).toBeUndefined();

    const age60s = verified(groups.get("60s"), isPresent);

    expect([...age60s]).toEqual([
      {
        id: "5",
        name: "Dominick Bosco",
        age: 64,
        visits: 622,
        status: "active",
      },
    ]);
  });

  test("grouping is reactive", () => {
    const people = Table.create<Person>({
      columns: ["name", "age", "visits", "status"],
    });

    people.append(...data);

    // group by age decade
    const byAgeDecade = Formula(() => {
      return people.groupBy((row) => {
        const decade = Math.floor(row.age / 10);
        return { bucket: decade, as: `${decade}0s` };
      }).groups;
    });

    expect(byAgeDecade.current.size).toEqual(3);
    let age20s = verified(byAgeDecade.current.get("20s"), isPresent);

    expect(age20s.rows).toEqual([
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
        id: "4",
        name: "Justin Turner",
        age: 25,
        visits: 174,
        status: "active",
      },
    ]);

    people.append({
      id: "6",
      name: "John Doe",
      age: 28,
      visits: 956,
      status: "active",
    });

    expect(byAgeDecade.current.size).toEqual(3);
    age20s = verified(byAgeDecade.current.get("20s"), isPresent);

    expect(age20s.rows).toEqual([
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
        id: "4",
        name: "Justin Turner",
        age: 25,
        visits: 174,
        status: "active",
      },
      {
        id: "6",
        name: "John Doe",
        age: 28,
        visits: 956,
        status: "active",
      },
    ]);
  });
});
