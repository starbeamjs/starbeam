import { reactive } from "@starbeam/collections";
import { pushingScope } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import {
  CachedFormula,
  Cell,
  Resource,
  ResourceList,
} from "@starbeam/universal";
import { describe, expect, test } from "vitest";

interface Item {
  id: number;
  name: string;
  location: string;
}

const TOM_ID = 1;
const CHIRAG_ID = 2;
const JOHN_ID = 3;

describe("ResourceList", () => {
  test("is exported from the universal authoring surface", () => {
    const items: Item[] = reactive.array([
      { id: TOM_ID, name: "Tom", location: "NYC" },
      { id: CHIRAG_ID, name: "Chirag", location: "NYC" },
    ]);

    const List = ResourceList(items, {
      key: (item) => item.id,
      map: (item) =>
        Resource(({ on }) => {
          const active = Cell(false);

          on.sync(() => {
            active.set(true);
          });

          on.finalize(() => {
            active.set(false);
          });

          return CachedFormula(() => ({
            active: active.current,
            label: `${item.name} (${item.location})`,
          }));
        }),
    });

    const [scope, { sync, value: list }] = pushingScope(() => List.setup());

    sync();

    expect(list.current.map((item) => item.current)).toEqual([
      { active: true, label: "Tom (NYC)" },
      { active: true, label: "Chirag (NYC)" },
    ]);

    items.push({ id: JOHN_ID, name: "John", location: "LA" });
    sync();

    expect(list.current.map((item) => item.current)).toEqual([
      { active: true, label: "Tom (NYC)" },
      { active: true, label: "Chirag (NYC)" },
      { active: true, label: "John (LA)" },
    ]);

    finalize(scope);

    expect(list.current.map((item) => item.current)).toEqual([
      { active: false, label: "Tom (NYC)" },
      { active: false, label: "Chirag (NYC)" },
      { active: false, label: "John (LA)" },
    ]);
  });
});
