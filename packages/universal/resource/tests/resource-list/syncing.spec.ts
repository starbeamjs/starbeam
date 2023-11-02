/* eslint-disable @typescript-eslint/no-magic-numbers */
import { reactive } from "@starbeam/collections";
import { CachedFormula, Cell, Marker } from "@starbeam/reactive";
import { Resource, ResourceList } from "@starbeam/resource";
import { pushingScope } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import { hasLength, verified } from "@starbeam/verify";
import {
  describe,
  entryPoint,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";

describe("a ResourceList's children sync", () => {
  test("basic functionality", () => {
    const events = new RecordedEvents();

    interface ChildState {
      readonly id: string;
      readonly value: Cell<number>;
      readonly invalidateSync: Marker;
    }

    function Child({ id, value, invalidateSync: invalidate }: ChildState) {
      return Resource(({ on }) => {
        const childEvents = events.prefixed(id);
        childEvents.record("setup");

        on.sync(() => {
          childEvents.record("sync");
          invalidate.read();

          return () => void childEvents.record("cleanup");
        });

        on.finalize(() => {
          childEvents.record("finalize");
        });

        return CachedFormula(() => `${id}:${value.current}`);
      });
    }

    const children = reactive.array([
      { id: "child1", value: Cell(0), invalidateSync: Marker() },
      { id: "child2", value: Cell(0), invalidateSync: Marker() },
    ] satisfies [ChildState, ChildState]);

    const List = ResourceList(children, {
      key: (item) => item.id,
      map: Child,
    });

    const [scope, { value: list, sync }] = pushingScope(() => List.setup());

    // const current = CachedFormula(() => list.current.map((v) => v.current));

    events.expect("child1:setup", "child2:setup");

    const current = AssertValue.value(
      CachedFormula(() => list.current.map((v) => v.current)),
      {
        extract: (formula) => formula(),
        expect: ["child1:0", "child2:0"],
      },
    );

    current.expect(UNCHANGED);

    sync();

    events.expect("child1:sync", "child2:sync");
    current.expect(UNCHANGED);

    sync();
    events.expect([]);

    children[0]?.value.update((v) => v + 1);

    current.expect(replaced(0, { with: "child1:1" }));
    events.expect([]);

    sync();
    events.expect([]);

    children[0]?.invalidateSync.mark();
    current.expect(UNCHANGED);

    sync();
    events.expect("child1:cleanup", "child1:sync");
    current.expect(UNCHANGED);

    children.push({
      id: "child3",
      value: Cell(0),
      invalidateSync: Marker(),
    });

    current.expect(replaced(2, { with: "child3:0" }));
    events.expect("child3:setup");

    sync();
    events.expect("child3:sync");
    current.expect(UNCHANGED);

    children.pop();
    events.expect([]);
    current.expect(popped);

    sync();
    events.expect("child3:cleanup", "child3:finalize");
    current.expect(UNCHANGED);

    const [first, second] = verified(children, hasLength(2)<ChildState>);
    children[0] = second;
    children[1] = first;

    current.expect(() => ["child2:0", "child1:1"]);
    events.expect([]);

    sync();
    expectNoop();

    children[0].value.update((v) => v + 1);
    current.expect(replaced(0, { with: "child2:1" }));
    events.expect([]);

    sync();
    expectNoop();

    children[1].invalidateSync.mark();
    expectNoop();

    sync();
    current.expect(UNCHANGED);
    events.expect("child1:cleanup", "child1:sync");

    finalize(scope);
    current.expect(UNCHANGED);
    events.expect(
      "child1:cleanup",
      "child1:finalize",
      "child2:cleanup",
      "child2:finalize",
    );

    finalize(scope);
    expectNoop();

    children[1].invalidateSync.mark();
    expectNoop();

    children[2]?.invalidateSync.mark();
    expectNoop();

    children.push({
      id: "child4",
      value: Cell(0),
      invalidateSync: Marker(),
    });
    expectNoop();

    sync();
    expectNoop();

    finalize(scope);
    expectNoop();

    function expectNoop() {
      entryPoint(
        () => {
          current.expect(UNCHANGED);
          events.expect([]);
        },
        { entryFn: expectNoop },
      );
    }
  });
});

const UNCHANGED = <T>(prev: T): T => prev;

class AssertValue<T, U> {
  static value = <T, U>(
    value: T,
    { extract, expect: expected }: { extract: (value: T) => U; expect: U },
  ): AssertValue<T, U> => {
    return entryPoint(
      () => {
        const extracted = extract(value);
        expect(extracted).toStrictEqual(expected);

        return new AssertValue(value, { extract, expect: expected });
      },
      { entryFn: AssertValue.value },
    );
  };

  #value: T;
  #extract: (value: T) => U;
  #lastValue: U;

  constructor(
    value: T,
    { extract, expect }: { extract: (value: T) => U; expect: U },
  ) {
    this.#value = value;
    this.#extract = extract;

    this.#lastValue = expect;
  }

  readonly expect = (change: (prev: U) => U) => {
    entryPoint(
      () => {
        const prev = this.#lastValue;
        const next = this.#extract(this.#value);

        expect(next).toStrictEqual(change(prev));

        this.#lastValue = next;
      },
      {
        entryFn: this.expect,
      },
    );
  };
}

function replaced<T>(at: number, options: { with: T }): (value: T[]) => T[] {
  return (array) => {
    const copy = [...array];
    copy[at] = options.with;
    return copy;
  };
}

function popped<T>(array: T[]): T[] {
  const copy = [...array];
  copy.pop();
  return copy;
}
