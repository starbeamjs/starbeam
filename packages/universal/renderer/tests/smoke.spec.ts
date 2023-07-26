import type { Reactive } from "@starbeam/interfaces";
import { Cell } from "@starbeam/reactive";
import { managerSetupReactive, type RendererManager } from "@starbeam/renderer";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

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
        idle: () => {
          // do nothing
        },
        layout: () => {
          // do nothing
        },
      },
    };

    const cell = Cell(0);
    const reactive = managerSetupReactive(manager, () => cell);
    expect(reactive.current).toBe(0);
  });
});
