import { describe, expect, test } from "@starbeam-workspace/test-utils";
import type { Reactive } from "@starbeam/interfaces";
import { Cell } from "@starbeam/reactive";
import { managerSetupReactive, type RendererManager } from "@starbeam/renderer";

describe("RendererManager", () => {
  test("smoke test", () => {
    const manager: RendererManager<
      object,
      <T>(reactive: Reactive<T>) => Reactive<T>
    > = {
      toNative: (reactive) => reactive,
      getComponent: () => ({}),
      setupValue: (_, create) => create(),
      setupRef: (_, value) => ({ current: value }),
      on: {
        idle: (_, handler) => {
          // do nothing
        },
        layout: (_, handler) => {
          // do nothing
        },
      },
    };

    const cell = Cell(0);
    const reactive = managerSetupReactive(manager, () => cell);
    expect(cell.current).toBe(0);
  });
});
