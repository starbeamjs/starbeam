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

enum Id {
  Tom = 1,
  Chirag = 2,
  John = 3,
}

describe("ResourceList", () => {
  test("is exported from the universal authoring surface", () => {
    const items: Item[] = reactive.array([
      { id: Id.Tom, name: "Tom", location: "NYC" },
      { id: Id.Chirag, name: "Chirag", location: "NYC" },
    ]);

    const List = ResourceList(items, {
      key: (item) => item.id,
      map: (item) =>
        Resource(({ on }) => {
          const active = Cell(false);

          on.sync(() => {
            active.set(true);
          });

          on.lowLevel.finalize(() => {
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

    items.push({ id: Id.John, name: "John", location: "LA" });
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
