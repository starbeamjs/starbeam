import { Cell, Marker } from "@starbeam/reactive";
import { Resource2, setupResource } from "@starbeam/resource";
import { pushingScope } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import { RecordedEvents } from "@starbeam-workspace/test-utils";
import { describe, expect, test } from "vitest";

const INITIAL_DATE = new Date("2022-01-01");

describe("new resources", () => {
  test("a basic resource", () => {
    const actions = new RecordedEvents();
    const invalidate = Marker();

    const resource = Resource2(({ on }) => {
      actions.record("construct");
      const cell = Cell(INITIAL_DATE);

      let isSetup = false;

      on.setup(() => {
        isSetup = true;
        invalidate.read();
        actions.record("setup");

        return () => {
          actions.record("cleanup");
          isSetup = false;
        };
      });

      return {
        get now() {
          return cell.current;
        },

        tick: () => {
          // this check emulates whaat would happen if the ticks were created
          // from something set up in setup rather than the test environment.
          if (isSetup) {
            cell.update(ticked);
          }
        },
      };
    });

    const [scope, clock] = pushingScope(() => resource());

    actions.expect("construct");
    expect(clock().now).toStrictEqual(INITIAL_DATE);

    clock().tick();

    actions.expect([]);
    expect(clock().now).toStrictEqual(INITIAL_DATE);

    setupResource(clock);

    expect(clock().now).toStrictEqual(INITIAL_DATE);
    actions.expect("setup");

    clock().tick();
    expect(clock().now).toStrictEqual(ticked(INITIAL_DATE));
    actions.expect([]);

    invalidate.mark();
    let last = ticked(INITIAL_DATE);
    expect(clock().now).toStrictEqual(last);
    actions.expect("cleanup", "setup");

    clock().tick();
    last = ticked(last);
    expect(clock().now).toStrictEqual(last);
    actions.expect([]);

    clock().tick();
    last = ticked(last);
    expect(clock().now).toStrictEqual(last);
    actions.expect([]);

    finalize(scope);
    actions.expect("cleanup");
    expect(clock().now).toStrictEqual(last);

    clock().tick();
    expect(clock().now).toStrictEqual(last);
    actions.expect([]);

    invalidate.mark();
    expect(clock().now).toStrictEqual(last);
    actions.expect([]);

    finalize(scope);
    expect(clock().now).toStrictEqual(last);
    actions.expect([]);
  });

  test("nested resources", () => {
    const Parent = Resource2(({ on }) => {});

    const Child = Resource2(({ on }) => {
      ``
    });
  });
});

function ticked(date: Date): Date {
  const update = new Date(date);
  update.setSeconds(update.getSeconds() + 1);
  return update;
}
