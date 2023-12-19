import type { ResourceBlueprint } from "@starbeam/resource";
import { Resource } from "@starbeam/resource";
import { Cell, Marker } from "@starbeam/universal";

import { RecordedEvents } from "./actions.js";

interface TestResourceInstance {
  readonly id: number;
  readonly count: number;
  readonly increment: () => void;
}

interface TestResourceState {
  readonly id: number;
  readonly events: RecordedEvents;
  readonly invalidate: () => void;
  readonly resource: ResourceBlueprint<TestResourceInstance>;
}

let NEXT_ID = 0;
const INITIAL_COUNT = 0;
const INCREMENT = 1;

export function TestResource(
  options?:
    | {
        events: RecordedEvents;
        prefix: string;
      }
    | undefined,
): TestResourceState {
  const allEvents = options?.events ?? new RecordedEvents();
  const localEvents = options
    ? options.events.prefixed(options.prefix)
    : allEvents;
  const invalidate = Marker();
  const id = NEXT_ID++;

  return {
    id,
    events: allEvents,
    invalidate: () => void invalidate.mark(),
    resource: Resource(({ on }) => {
      const cell = Cell(INITIAL_COUNT);
      localEvents.record("setup");

      on.sync(() => {
        localEvents.record("sync");
        invalidate.read();

        return () => void localEvents.record("cleanup");
      });

      on.finalize(() => {
        localEvents.record("finalize");
      });

      return {
        id,
        get count() {
          return cell.current;
        },
        increment() {
          cell.update((n) => n + INCREMENT);
        },
      };
    }),
  };
}
