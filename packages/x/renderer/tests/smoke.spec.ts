import { Cell } from "@starbeam/reactive";
import type { RendererManager } from "@starbeam/renderer";
import { managerSetupReactive } from "@starbeam/renderer";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

const INITIAL = 0;

describe("RendererManager", () => {
  test("smoke test", () => {
    const manager: RendererManager<object> = {
      getComponent: () => ({}),
      setupValue: (_, create) => create(),
      setupRef: (_, value) => ({ current: value }),
      createNotifier: () => () => {},
      createScheduler: () => ({
        schedule: () => {},
        onSchedule: () => {},
      }),
      on: {
        idle: () => {
          // do nothing
        },
        mounted: () => {
          // do nothing
        },
        layout: () => {
          // do nothing
        },
      },
    } satisfies RendererManager<object>;

    const cell = Cell(INITIAL);
    const reactive = managerSetupReactive(manager, () => cell);
    expect(reactive.current).toBe(INITIAL);
  });
});
