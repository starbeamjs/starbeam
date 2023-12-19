/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Cell, Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";
import { getServiceFormula, service } from "@starbeam/service";
import { finalize } from "@starbeam/shared";
import { describe, RecordedEvents, test } from "@starbeam-workspace/test-utils";

describe("service", () => {
  test("should be able to create a service", () => {
    const events = new RecordedEvents();

    const invalidate = Marker();
    const Counter = Resource(({ on }) => {
      events.record("init");
      const count = Cell(0);

      on.sync(() => {
        events.record("sync");
        invalidate.read();
      });

      on.finalize(() => void events.record("finalize"));
      return {
        get count() {
          return count.current;
        },
        increment() {
          events.record("increment");
          count.current++;
        },
      };
    });

    const app = {};
    const syncApp = getServiceFormula(app);
    CONTEXT.app = app;
    // @todo auto-sync via the app root
    const counter = service(Counter);

    events.expect("init");
    syncApp();
    events.expect("sync");

    counter.increment();
    events.expect("increment");
    syncApp();
    events.expect([]);

    invalidate.mark();
    syncApp();
    events.expect("sync");
  });

  test("adding a service invalidates syncApp", () => {
    const allEvents = new RecordedEvents();

    function createCounterService(name: string) {
      const invalidate = Marker();
      const events = allEvents.prefixed(name);

      return Resource(({ on }) => {
        events.record("init");
        const count = Cell(0);

        on.sync(() => {
          events.record("sync");
          invalidate.read();
        });

        on.finalize(() => void events.record("finalize"));

        return {
          mark() {
            invalidate.mark();
          },
          get count() {
            return count.current;
          },
          increment() {
            events.record("increment");
            count.current++;
          },
        };
      });
    }

    const app = {};
    const syncApp = getServiceFormula(app);
    CONTEXT.app = app;

    const counter1 = service(createCounterService("counter1"));

    allEvents.expect("counter1:init");

    syncApp();
    allEvents.expect("counter1:sync");

    counter1.increment();
    allEvents.expect("counter1:increment");

    syncApp();
    allEvents.expect([]);

    const counter2 = service(createCounterService("counter2"));
    allEvents.expect("counter2:init");

    syncApp();
    allEvents.expect("counter2:sync");

    syncApp();
    allEvents.expect([]);

    counter1.mark();
    syncApp();
    allEvents.expect("counter1:sync");

    counter2.increment();
    allEvents.expect("counter2:increment");

    syncApp();
    allEvents.expect([]);

    counter2.mark();
    syncApp();
    allEvents.expect("counter2:sync");

    counter1.increment();
    counter2.increment();

    allEvents.expect("counter1:increment", "counter2:increment");

    syncApp();
    allEvents.expect([]);

    counter1.mark();
    counter2.mark();
    allEvents.expect([]);

    syncApp();
    allEvents.expect("counter1:sync", "counter2:sync");

    syncApp();
    allEvents.expect([]);

    finalize(app);
    allEvents.expect("counter1:finalize", "counter2:finalize");

    syncApp();
    allEvents.expect([]);

    // incrementing after finalizing still works because the underlying
    // object is still a normal cell.
    counter1.increment();
    syncApp();
    allEvents.expect("counter1:increment");

    counter2.increment();
    syncApp();
    allEvents.expect("counter2:increment");

    // but invalidating the sync formula doesn't do anything because the sync
    // formula is finalized.
    counter1.mark();
    syncApp();
    allEvents.expect([]);

    counter2.mark();
    syncApp();
    allEvents.expect([]);

    // finalizing the app again does nothing
    finalize(app);
    allEvents.expect([]);
  });
});
