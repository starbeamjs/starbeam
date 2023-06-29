import {
  finalize,
  linkToFinalizationScope,
  onFinalize,
  pushFinalizationScope,
  testing,
} from "@starbeam/shared";
import { beforeEach, describe, expect, test as vitestTest } from "vitest";

import { Actions } from "./support/actions.js";

interface LifetimeContext {
  actions: Actions;
  object: object;
  object2: object;
}

describe("lifetime stack", () => {
  beforeEach<LifetimeContext>((context) => {
    context.actions = new Actions();
    context.object = { obj: 1 };
    context.object2 = { obj: 2 };

    onFinalize(context.object, () => {
      context.actions.record("finalize:object");
    });

    onFinalize(context.object2, () => {
      context.actions.record("finalize:object2");
    });
  });

  const test = vitestTest<LifetimeContext>;

  describe("registering finalizers", () => {
    test("registering a finalizer", ({ actions, object }) => {
      actions.expect([]);

      finalize(object);
      actions.expect("finalize:object");
    });

    test("registering multiple finalizers", ({ actions, object }) => {
      onFinalize(object, () => {
        actions.record("finalize:object:another");
      });

      actions.expect([]);

      finalize(object);
      actions.expect("finalize:object", "finalize:object:another");
    });
  });

  describe("finalizers are run by the GC as a last resort", () => {
    test("finalizers run", ({ actions }) => {
      actions.expect([]);

      gc();

      actions.expect("finalize:object", "finalize:object2");
    });

    test("after the finalizer is invoked by the GC, explicitly invoking the finalizer does nothing", ({
      actions,
      object,
    }) => {
      actions.expect([]);

      gc();
      actions.expect("finalize:object", "finalize:object2");

      finalize(object);
      actions.expect([]);
    });

    test("after the finalizer is invoked explicitly, the GC does not invoke the finalizer", ({
      actions,
      object,
    }) => {
      actions.expect([]);

      finalize(object);
      actions.expect("finalize:object");

      gc();
      actions.expect("finalize:object2");
    });
  });

  describe("finalization scopes", () => {
    test("linking to a scope", ({ actions, object }) => {
      const done = pushFinalizationScope();
      linkToFinalizationScope(object);
      const scope = done();

      onFinalize(scope, () => {
        actions.record("finalize:scope");
      });

      finalize(scope);

      // children are finalized first.
      actions.expect("finalize:object", "finalize:scope");

      finalize(scope);
      actions.expect([]);
    });

    test("linking multiple objects to a scope", ({
      actions,
      object,
      object2,
    }) => {
      const done = pushFinalizationScope();
      linkToFinalizationScope(object);
      linkToFinalizationScope(object2);
      const scope = done();

      onFinalize(scope, () => {
        actions.record("finalize:scope");
      });

      actions.expect([]);

      finalize(scope);

      actions.expect("finalize:object", "finalize:object2", "finalize:scope");

      finalize(scope);
      actions.expect([]);

      finalize(object);
      finalize(object2);

      actions.expect([]);
    });

    describe("nested finalization scopes", () => {
      function setupScopes({ object, object2, actions }: LifetimeContext) {
        const outerDone = pushFinalizationScope();
        // object is added first
        linkToFinalizationScope(object);
        // the child scope is added next
        const nestedDone = pushFinalizationScope();
        // then object2 is added to the child scope
        linkToFinalizationScope(object2);
        const nestedScope = nestedDone();
        const outerScope = outerDone();

        onFinalize(nestedScope, () => {
          actions.record("finalize:scope:nested");
        });

        onFinalize(outerScope, () => {
          actions.record("finalize:scope:outer");
        });

        actions.expect([]);

        return { outerScope, nestedScope };
      }

      test("finalizing the outer scope finalizes everything", (context) => {
        const { actions, object, object2 } = context;
        const { outerScope, nestedScope } = setupScopes(context);

        finalize(outerScope);

        // children are finalized in the order they are added, including
        // child scopes
        actions.expect(
          "finalize:object",
          "finalize:object2",
          "finalize:scope:nested",
          "finalize:scope:outer"
        );

        finalize(nestedScope);
        actions.expect([]);

        finalize(object);
        finalize(object2);
        actions.expect([]);
      });

      test("finalizing the nested scope finalizes only its contents", (context) => {
        const { actions, object, object2 } = context;
        const { outerScope, nestedScope } = setupScopes(context);

        finalize(nestedScope);
        actions.expect("finalize:object2", "finalize:scope:nested");

        finalize(outerScope);
        actions.expect("finalize:object", "finalize:scope:outer");

        finalize(object);
        finalize(object2);
        actions.expect([]);
      });

      test("finalizing an object in a scope and then the scope only finalizes the object once", (context) => {
        const { actions, object, object2 } = context;
        const { outerScope, nestedScope } = setupScopes(context);

        finalize(object);
        actions.expect("finalize:object");

        finalize(object2);
        actions.expect("finalize:object2");

        finalize(nestedScope);
        actions.expect("finalize:scope:nested");

        finalize(outerScope);
        actions.expect("finalize:scope:outer");

        for (const toFinalize of [object, object2, nestedScope, outerScope]) {
          finalize(toFinalize);
        }
        actions.expect([]);
      });
    });

    describe("explicitly linking a child to a scope", () => {
      test("purely dynamically", ({ actions, object, object2 }) => {
        const scope = pushFinalizationScope()();

        onFinalize(scope, () => {
          actions.record("finalize:scope");
        });

        linkToFinalizationScope(object, scope);
        linkToFinalizationScope(object2, scope);

        actions.expect([]);

        finalize(scope);
        actions.expect("finalize:object", "finalize:object2", "finalize:scope");
      });
    });

    describe("pushing an existing finalization scope", () => {
      test("the basics", ({ actions, object, object2 }) => {
        const scope = pushFinalizationScope()();

        {
          const done = pushFinalizationScope(scope);
          linkToFinalizationScope(object);
          done();
        }

        {
          const done = pushFinalizationScope(scope);
          linkToFinalizationScope(object2);
          done();
        }

        actions.expect([]);

        finalize(scope);
        actions.expect("finalize:object", "finalize:object2");
      });

      test("nesting an existing scope in a new one", ({
        actions,
        object,
        object2,
      }) => {
        const scope = pushFinalizationScope()();

        const doneOuterScope = pushFinalizationScope();
        {
          const done = pushFinalizationScope(scope);
          linkToFinalizationScope(object);
          done();
        }
        const outerScope = doneOuterScope();

        {
          const done = pushFinalizationScope(scope);
          linkToFinalizationScope(object2);
          done();
        }

        onFinalize(outerScope, () => {
          actions.record("finalize:scope:outer");
        });

        onFinalize(scope, () => {
          actions.record("finalize:scope:nested");
        });

        actions.expect([]);

        finalize(outerScope);
        actions.expect(
          "finalize:object",
          "finalize:object2",
          "finalize:scope:nested",
          "finalize:scope:outer"
        );
      });

      test("nesting a new scope in an existing scope", ({
        actions,
        object,
        object2,
      }) => {
        const outerScope = pushFinalizationScope()();

        const doneOuterScope = pushFinalizationScope(outerScope);
        const doneInnerScope = pushFinalizationScope();
        linkToFinalizationScope(object);
        const innerScope = doneInnerScope();
        doneOuterScope();

        {
          const done = pushFinalizationScope(outerScope);
          linkToFinalizationScope(object2);
          done();
        }

        onFinalize(innerScope, () => {
          actions.record("finalize:scope:inner");
        });

        onFinalize(outerScope, () => {
          actions.record("finalize:scope:outer");
        });

        actions.expect([]);

        finalize(outerScope);
        actions.expect(
          "finalize:object",
          "finalize:scope:inner",
          "finalize:object2",
          "finalize:scope:outer"
        );
      });
    });
  });
});

type UnregisterToken = object;

interface MockTarget<T> {
  readonly target: object;
  readonly heldValue: T;
  readonly unregisterToken: UnregisterToken | undefined;
}

let lastRegistry: MockFinalizationRegistry<string> | undefined;

class MockFinalizationRegistry<T> implements FinalizationRegistry<T> {
  #targets: MockTarget<T>[] = [];
  #callback: (heldValue: T) => void;

  readonly [Symbol.toStringTag] = "FinalizationRegistry";

  constructor(callback: (heldValue: T) => void) {
    this.#callback = callback;

    lastRegistry = this as unknown as MockFinalizationRegistry<string>;
  }

  register(
    target: object,
    heldValue: T,
    unregisterToken?: UnregisterToken | undefined
  ): void {
    this.#targets.push({
      target,
      heldValue,
      unregisterToken,
    });
  }

  unregister(unregisterToken: object): void {
    this.#targets = this.#targets.filter(
      (target) => target.unregisterToken !== unregisterToken
    );
  }

  gc(): void {
    const targets = this.#targets;
    this.#targets = [];

    for (const target of targets) {
      this.#callback(target.heldValue);
    }
  }
}

function gc() {
  expect(lastRegistry).toBeDefined();
  lastRegistry?.gc();
}

testing({ registry: MockFinalizationRegistry });
