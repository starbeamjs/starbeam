import {
  getLast,
  getLastIndex,
  isPresent,
  isPresentArray,
  withoutLast,
} from "@starbeam/core-utils";
import type { Description } from "@starbeam/debug";
import {
  callerStack,
  Desc,
  DisplayStruct,
  entryPointFn,
  entryPoints,
} from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import {
  Cell,
  Formula,
  LIFETIME,
  Resource,
  type ResourceBlueprint,
  Wrap,
} from "@starbeam/universal";
import { exhaustive, verified } from "@starbeam/verify";
import { describe, expect, test } from "vitest";

import { scenario } from "./support/scenario.js";

const INITIAL_ID = 0;

class Socket {
  static #nextId = INITIAL_ID;

  static subscribe(name: string): Socket {
    return new Socket(name, true);
  }

  readonly id: string;
  readonly #name: string;
  #active: boolean;

  constructor(name: string, active: boolean) {
    this.id = String(Socket.#nextId++);
    this.#name = name;
    this.#active = active;
  }

  get name(): string {
    return this.#name;
  }

  get isActive(): boolean {
    return this.#active;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Socket", {
      id: this.id,
      name: this.#name,
      active: this.#active,
    });
  }

  disconnect(): void {
    this.#active = false;
  }
}

Subscription({ username: "@tomdale", channel: "emails" })
  .describe(
    "a resource is a formula with lifetime",
    (start, { username, channel }) =>
      start(({ assert }) => {
        assert.initial({
          description: "@tomdale @ emails",
          name: "emails",
          state: "active",
        });
      })
        .step(
          "updating a dependency of the resource instance that is *not* a dependency of the resource constructor",
          () => username.set("@todale"),
          ({ assert }) => {
            assert.unstable();
            assert.socket.isStable({
              state: "active",
              name: "emails",
              description: "@todale @ emails",
            });
          }
        )
        .step(
          "updating a dependency of the resource constructor",
          () => channel.set("twitter"),
          ({ assert }) => {
            assert.unstable();
            assert.socket.changed({
              state: "active",
              name: "twitter",
              description: "@todale @ twitter",
            });
          }
        )
        .finalize(({ assert }) => {
          assert.isFinalized({
            state: "finalized",
            name: "twitter",
            description: "@todale @ twitter",
          });
        })
  )
  .describe("the resource can be cleaned up early", (start, { channel }) =>
    start(({ assert }) => {
      assert.initial({
        description: "@tomdale @ emails",
        name: "emails",
        state: "active",
      });
    })
      .finalize(({ assert }) => {
        assert.unstable();
        assert.socket.isStable({
          state: "finalized",
          name: "emails",
          description: "@tomdale @ emails",
        });
      })
      .step(
        "setting a dependency of the resource after it was finalized doesn't re-run the constructor",
        () => channel.set("twitter"),
        ({ assert }) => {
          assert.unstable();
          assert.socket.isStable({
            state: "finalized",
            name: "emails",
            description: "@tomdale @ twitter",
          });
        }
      )
  );

const INITIAL_COUNT = 0;
const INCREMENT = 1;

describe("use()", () => {
  test("using a resource in a previous run but not this one causes it to be cleaned up", () => {
    const Inner = Resource(({ on }) => {
      const cell = Cell("active");

      on.cleanup(() => {
        cell.set("finalized");
      });

      return cell;
    }, "Inner");

    const counter = Cell(INITIAL_COUNT, { description: "i" });
    let run = 0;
    let currentInstance = undefined as Reactive<string> | undefined;
    let prevInner = undefined as Reactive<string> | undefined;

    const outer = Resource(({ use }) => {
      prevInner = currentInstance;
      const next = (currentInstance = use(Inner));
      const currentRun = run++;

      // intentionally do this at the top level so that the resource constructor is invalidated.
      const currentI = counter.current;

      return Formula(
        () => `${next.current} (run = ${currentRun}, i = ${currentI})`,
        { description: "OuterFormula" }
      );
    }, "Outer");

    const parent = {};

    const instance = outer.create(parent);

    expect(instance.current).toBe("active (run = 0, i = 0)");
    expect(prevInner?.current).toBe(undefined);

    counter.update((i) => i + INCREMENT);
    expect(instance.current).toBe("active (run = 1, i = 1)");
    expect(prevInner?.current).toBe("finalized");

    counter.update((i) => i + INCREMENT);
    expect(instance.current).toBe("active (run = 2, i = 2)");
    expect(prevInner?.current).toBe("finalized");
  });

  test("transferring a resource prevents it from being cleaned up", () => {
    const { resource: inner } = TestResource("inner");

    const outerDep = Cell(INITIAL_COUNT, { description: "OuterDep" });
    const formulaDep = Cell(INITIAL_COUNT, { description: "FormulaDep" });

    const Outer = Resource(({ use, on }) => {
      const innerValue = use(inner);

      expect(innerValue).toBe(inner);

      const cell = Cell(`outer: active (${outerDep.current})`);

      on.cleanup(() => {
        cell.set("outer: finalized");
      });

      return Formula(
        () =>
          `${cell.current}, ${innerValue.current}, formula-dep: ${formulaDep.current}`,
        { description: "Outer Formula" }
      );
    }, "Outer");

    const outer = Outer.root();

    expect(outer.resource.current).toBe(
      "outer: active (0), inner: active, formula-dep: 0"
    );

    formulaDep.update((i) => i + INCREMENT);

    expect(outer.resource.current).toBe(
      "outer: active (0), inner: active, formula-dep: 1"
    );
    expect(inner.current).toBe("inner: active");

    outerDep.update((i) => i + INCREMENT);

    expect(outer.resource.current).toBe(
      "outer: active (1), inner: active, formula-dep: 1"
    );
  });
});

scenario("use(resource)", () => {
  const { resource: inner } = TestResource("inner");

  const outerDep = Counter("OuterDep");
  const formulaDep = Counter("FormulaDep");

  return {
    inner,
    deps: {
      run: outerDep,
      counter: formulaDep,
    },
  };
})
  .test(
    "the return value of use() is the same as the value of the resource passed to use()",
    ({ inner: Inner }) => {
      const { resource: outer, owner } = Resource(({ use }) => {
        const inner = use(Inner);
        expect(inner).toBe(Inner);
        return inner;
      }, "Outer").root();

      expect(outer.current).toBe("inner: active");

      // the inner resource is finalized regardless of how the outer resoruce is finalized.
      return [
        () => {
          LIFETIME.finalize(owner);
          expect(outer.current).toBe("inner: finalized");
        },
        () => {
          LIFETIME.finalize(outer);
          expect(outer.current).toBe("inner: finalized");
        },
      ];
    }
  )
  .test("a reused inner value is not finalized", ({ inner: Inner, deps }) => {
    const { resource: outer, owner } = Resource(({ use }) => {
      const run = deps.run.current;

      const inner = use(Inner);
      expect(inner).toBe(Inner);

      return Formula(
        () => `${inner.current} (run: ${run}, counter: ${deps.counter.current})`
      );
    }, "Outer").root();

    expect(outer.current).toBe("inner: active (run: 0, counter: 0)");

    deps.counter.increment();
    expect(outer.current).toBe("inner: active (run: 0, counter: 1)");

    deps.run.increment();
    expect(outer.current).toBe("inner: active (run: 1, counter: 1)");

    deps.counter.increment();
    deps.run.increment();
    expect(outer.current).toBe("inner: active (run: 2, counter: 2)");

    // the inner resource is finalized regardless of how the outer resoruce is finalized.
    return [
      () => {
        LIFETIME.finalize(owner);
        expect(outer.current).toBe("inner: finalized (run: 2, counter: 2)");
      },
      () => {
        LIFETIME.finalize(outer);
        expect(outer.current).toBe("inner: finalized (run: 2, counter: 2)");
      },
    ];
  })
  .test(
    "an inner value that wasn't reused is finalized",
    ({ inner: Inner, deps }) => {
      function OnTheFly(value: number): TestResourceState {
        return TestResource(`on-the-fly-${value}`);
      }

      const items = new Items<TestResourceState>();

      const verifyInvariants = entryPointFn(
        ({ finalized = false }: { finalized?: boolean } = {}) => {
          if (!finalized && items.active) {
            const { item, index } = items.active;
            expect(item?.resource.current).toBe(`on-the-fly-${index}: active`);
          }

          const inactive = finalized ? items.all : items.inactive;

          inactive.forEach((item, i) => {
            expect(item.resource.current).toBe(`on-the-fly-${i}: finalized`);
          });
        }
      );

      const { resource: outer, owner } = Resource(({ use }) => {
        const run = deps.run.current;

        const inner = use(Inner);
        expect(inner).toBe(Inner);
        const dynamicResource = OnTheFly(run);
        const usedDynamicResource = use(dynamicResource.resource);
        items.push(dynamicResource);

        return Formula(() => ({
          inner: inner.current,
          run,
          counter: deps.counter.current,
          dynamic: usedDynamicResource.current,
        }));
      }, "Outer").root();

      expect(outer.current).toStrictEqual({
        inner: "inner: active",
        run: 0,
        counter: 0,
        dynamic: "on-the-fly-0: active",
      });

      verifyInvariants();

      deps.counter.increment();

      expect(outer.current).toStrictEqual({
        inner: "inner: active",
        run: 0,
        counter: 1,
        dynamic: "on-the-fly-0: active",
      });

      verifyInvariants();

      deps.run.increment();

      expect(outer.current).toStrictEqual({
        inner: "inner: active",
        run: 1,
        counter: 1,
        dynamic: "on-the-fly-1: active",
      });

      verifyInvariants();

      return [
        () => {
          LIFETIME.finalize(owner);
          expect(Inner.current).toBe("inner: finalized");
          expect(outer.current).toStrictEqual({
            inner: "inner: finalized",
            run: 1,
            counter: 1,
            dynamic: "on-the-fly-1: finalized",
          });
          verifyInvariants({ finalized: true });
        },
        () => {
          const active = verified(items.active?.item?.resource, isPresent);
          LIFETIME.finalize(Inner);

          expect(Inner.current).toBe("inner: finalized");
          verifyInvariants({ finalized: false });

          LIFETIME.finalize(active);
          expect(Inner.current).toBe("inner: finalized");
          expect(active.current).toBe("on-the-fly-1: finalized");

          verifyInvariants({ finalized: true });
        },
      ];
    }
  );

class Items<T> {
  readonly #items: T[] = [];

  get all(): T[] {
    return this.#items;
  }

  get inactive(): T[] {
    return withoutLast(this.#items);
  }

  get activeIndex(): number | undefined {
    return getLastIndex(this.#items);
  }

  get active(): { item: T | undefined; index: number } | undefined {
    if (isPresentArray(this.#items)) {
      const item = getLast(this.#items);
      const index = getLastIndex(this.#items);

      return { item, index };
    }
  }

  push(item: T): void {
    this.#items.push(item);
  }
}

function Counter(
  description?: Description | string
): { increment: () => void } & Cell<number> {
  const desc = Desc("cell", description);
  const cell = Cell(INITIAL_COUNT, { description: desc });

  return Wrap(
    cell,
    {
      increment() {
        cell.update((i) => i + INCREMENT);
      },
    },
    desc
  );
}

import { getID } from "@starbeam/shared";

interface TestResourceState {
  resource: Resource<string>;
  blueprint: ResourceBlueprint<string>;
  parent: object;
}

const TestResource = entryPointFn((description: string): TestResourceState => {
  const parent = Object.create(null) as object;

  const blueprint = Resource(({ on }) => {
    const id = getID();
    const cell = Cell(`${description}: active`);

    on.cleanup(() => {
      cell.set(`${description}: finalized`);
    });

    return Wrap(cell, { id }, "TestResource");
  }, description);

  const resource = blueprint.create(parent);

  return {
    resource,
    blueprint,
    parent,
  };
});

type ResourceStatus = "did construct" | "did cleanup";

interface ResourceState {
  readonly status: ResourceStatus;
  readonly socket: Socket;
  readonly description: string;
}

interface DescribeSubscription {
  describe: (
    name: string,
    callback: (
      start: (this: void, assert: (state: StepState) => void) => Steps,
      cells: { username: Cell<string>; channel: Cell<string> }
    ) => void
  ) => DescribeSubscription;
}

function Subscription({
  username: u,
  channel: c,
}: {
  username: string;
  channel: string;
}): DescribeSubscription {
  const username = Cell(u);
  const channel = Cell(c);

  const resource = Resource(({ on }) => {
    const socket = Socket.subscribe(channel.current);
    const status = Cell("did construct" as ResourceStatus);

    on.cleanup(() => {
      status.set("did cleanup");
      socket.disconnect();
    });

    return Formula(() => {
      return {
        status: status.current,
        socket,
        description: `${username.current} @ ${channel.current}`,
      };
    });
  });

  return {
    describe(
      name: string,
      callback: (
        start: (this: void, assert: (state: StepState) => void) => Steps,
        cells: { username: Cell<string>; channel: Cell<string> }
      ) => void
    ): DescribeSubscription {
      function start(this: void, assert: (state: StepState) => void): Steps {
        const stack = callerStack();
        const steps = new Steps(resource);

        test(
          "initial state",
          entryPointFn(
            () => {
              assert(new StepState(undefined, steps.resource.current));
            },
            { stack }
          )
        );
        return steps;
      }

      describe(name, () => {
        callback(start, { username, channel });
      });
      return Subscription({ username: u, channel: c });
    },
  };
}

type StateAssertion = { state: "active" } | { state: "finalized" };

interface DetailsAssertion {
  name: string;
  description: string;
}

type Postcondition = StateAssertion & DetailsAssertion;

class StepState {
  assert = entryPoints({
    equivalent: () => {
      expect(this.prev).toEqual(this.state);
    },

    initial: (condition: Postcondition) => {
      expect(this.prev, "the previous resource state").toBeUndefined();
      this.#assert(condition);
    },

    stable: (condition: Postcondition) => {
      expect(this.prev, "the previous resource state").toBe(this.state);
      this.#assert(condition);
    },

    unstable: () => {
      expect(this.prev).not.toBe(this.state);
    },

    description: (description: string) => {
      expect(this.state.description, "the current description").toBe(
        description
      );
    },

    isActive: () => {
      this.#assertState({ state: "active" });
    },

    isFinalized: (condition: Postcondition) => {
      this.#assertState({ state: "finalized" });
      this.#assert(condition);
    },

    socket: entryPoints({
      isStable: (condition: Postcondition) => {
        this.#assertStableSocket();
        this.#assert(condition);
      },

      changed: (condition: Postcondition) => {
        this.#assertUnstableSocket();
        this.#assert(condition);
      },
    }),
  });

  constructor(
    readonly prev: ResourceState | undefined,
    readonly state: ResourceState
  ) {}

  #assertStatus(status: ResourceStatus, state = this.state): void {
    expect(state.status, "the resource's status").toBe(status);
  }

  #assertSocketActive(isActive: boolean, state = this.state): void {
    expect(state.socket?.isActive, "the socket's active state").toBe(isActive);
  }

  #assertStableSocket(): void {
    expect(this.prev?.socket, "the previous socket").toBe(this.state.socket);
  }

  #assertUnstableSocket(): void {
    expect(this.prev?.socket, "the previous socket").not.toBe(
      this.state.socket
    );
  }

  #assertState(options: StateAssertion, state = this.state): void {
    switch (options.state) {
      case "active":
        this.#assertStatus("did construct", state);
        this.#assertSocketActive(true, state);
        break;
      case "finalized":
        this.#assertStatus("did cleanup", state);
        this.#assertSocketActive(false, state);
        this.#assertStableSocket();
        break;
      default:
        exhaustive(options);
    }
  }

  #assertDetails(options: DetailsAssertion, state = this.state): void {
    expect(state.description, "the resource's description").toBe(
      options.description
    );
    expect(state.socket?.name, "the resource's name").toBe(options.name);
  }

  #assert(
    options: StateAssertion & DetailsAssertion,
    state = this.state
  ): void {
    this.#assertState(options, state);
    this.#assertDetails(options, state);
  }
}

class Steps {
  #state: ResourceState;
  #owner: object;
  readonly blueprint: ResourceBlueprint<ResourceState>;
  readonly resource: Reactive<ResourceState>;

  constructor(blueprint: ResourceBlueprint<ResourceState>) {
    this.#owner = {};
    this.blueprint = blueprint;
    this.resource = blueprint.create(this.#owner);
    this.#state = this.resource.current;
  }

  step(
    description: string,
    action: (options: { resource: Reactive<ResourceState> }) => void,
    assert: (options: StepState) => void
  ): this {
    const stack = callerStack();
    test(
      description,
      entryPointFn(
        () => {
          const prev = this.#state;
          action({ resource: this.resource });
          this.#state = this.resource.current;
          assert(new StepState(prev, this.#state));
        },
        { stack }
      )
    );

    return this;
  }

  finalize(assert: (options: StepState) => void): this {
    test(
      "finalizing",
      entryPointFn(
        () => {
          const prev = this.#state;
          LIFETIME.finalize(this.#owner);
          this.#state = this.resource.current;
          assert(new StepState(prev, this.#state));
          return this;
        },
        { stack: callerStack() }
      )
    );
    return this;
  }
}
