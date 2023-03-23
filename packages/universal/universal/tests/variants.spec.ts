import { Tagged } from "@starbeam/timeline";
import { Formula, TIMELINE, Variants } from "@starbeam/universal";
import { describe, expect, test } from "vitest";

interface Bool {
  true: [];
  false: [];
}

interface Option<T> {
  none: [];
  some: [T];
}

interface Lifecycle<T> {
  idle: [];
  loading: [];
  loaded: [T];
  error: [Error];
}

describe("Variants", () => {
  test("simple variant", () => {
    const Bool = Variants<Bool>();
    const bool = Bool.true();

    const type = Formula(() => bool.current.type);
    const typeStable = Stability(type);

    expect(type.current).toBe("true");
    expect(typeStable.changed).toBe(false);

    bool.choose("true");
    expect(type.current).toBe("true");
    expect(typeStable.changed).toBe(false);

    bool.choose("false");
    expect(typeStable.changed).toBe(true);
    expect(type.current).toBe("false");
  });

  test("variant with value", () => {
    const Option = Variants<Option<number>>();
    const option = Option.none();

    const type = Instrument(() => option.current.type);
    const value = Instrument(() => {
      switch (option.current.type) {
        case "some":
          return option.current.value;
        default:
          return undefined;
      }
    });

    expect(type({ expect: "initialized" })).toBe("none");
    expect(value({ expect: "initialized" })).toBe(undefined);
    expect(type({ expect: "stable" })).toBe("none");

    option.choose("none");
    expect(type({ expect: "stable" })).toBe("none");
    expect(value({ expect: "stable" })).toBe(undefined);

    option.choose("some", 1);
    expect(type({ expect: "changed" })).toBe("some");
    expect(value({ expect: "changed" })).toBe(1);
  });

  test("moving between unrelated variants doesn't invalidate a formula that consumed a variant", () => {
    const Lifecycle = Variants<Lifecycle<number>>("Lifecycle");
    const lifecycle = Lifecycle.idle();

    const advance = Formula(() => {
      // this is testing that only a transition from idle or to idle invalidates this formula, and
      // not transitions between other variants. This formula will invalidate if the variant returns
      // to `idle`, since the `lifecycle.is("idle")` check will have changed from `false` to `true`.
      if (lifecycle.is("idle")) {
        lifecycle.choose("loading");
      }
    }, "advance");

    const render = Formula((): number | Error | "idle" | "loading" => {
      advance();

      if (lifecycle.is("idle")) {
        return "idle";
      } else if (lifecycle.is("loading")) {
        return "loading";
      } else if (lifecycle.is("loaded")) {
        return lifecycle.current.value;
      } else if (lifecycle.is("error")) {
        return lifecycle.current.value;
      } else {
        throw Error("unreachable");
      }
    }, "render");

    const value = Formula(() => {
      return lifecycle.match({
        loaded: (v) => v,
      });
    }, "value");

    const advanceStable = Stability(advance);
    const renderStable = Stability(render);
    const valueStable = Stability(value);

    expect(render()).toBe("loading");
    expect(value()).toBe(undefined);
    expect(advanceStable.changed).toBe(false);
    expect(renderStable.changed).toBe(false);
    expect(valueStable.changed).toBe(false);

    lifecycle.choose("loaded", 1);
    // since we're transitioning from loading to loaded, the `.is("idle")` check in the formula is
    // is not invalidated.
    expect(advanceStable.changed).toBe(false);

    // since `value` depends on the `loaded` state, it is invalidated.
    expect(valueStable.changed).toBe(true);
    expect(value()).toBe(1);
    // but since `render` depends on all variants, it is invalidated.
    expect(renderStable.changed).toBe(true);
    expect(render()).toBe(1);
    expect(renderStable.changed).toBe(false);

    // repeat to ensure stability
    expect(render()).toBe(1);
    expect(advanceStable.changed).toBe(false);
    expect(renderStable.changed).toBe(false);
    expect(valueStable.changed).toBe(false);

    lifecycle.choose("loaded", 1);
    expect(advanceStable.changed).toBe(false);
    expect(renderStable.changed).toBe(false);
    expect(valueStable.changed).toBe(false);
    expect(render()).toBe(1);

    lifecycle.choose("loaded", 2);
    expect(advanceStable.changed).toBe(false);
    expect(renderStable.changed).toBe(true);
    expect(valueStable.changed).toBe(true);
    expect(render()).toBe(2);
    expect(value()).toBe(2);

    lifecycle.choose("idle");
    expect(advanceStable.changed).toBe(true);
    expect(renderStable.changed).toBe(true);
    expect(valueStable.changed).toBe(true);
    expect(render()).toBe("loading");
    expect(value()).toBe(undefined);
    expect(advanceStable.changed).toBe(true);
    expect(renderStable.changed).toBe(true);
    expect(valueStable.changed).toBe(false);
    expect(render()).toBe("loading");

    lifecycle.choose("loaded", 3);
    expect(advanceStable.changed).toBe(false);
    expect(renderStable.changed).toBe(true);
    expect(valueStable.changed).toBe(true);
    expect(render()).toBe(3);
    expect(value()).toBe(3);
  });

  test("transitioning from one variant to another that were both used in an .is() doesn't invalidate", () => {
    const Lifecycle = Variants<Lifecycle<number>>("Lifecycle");
    const lifecycle = Lifecycle.idle();

    const isResolved = Formula(() => {
      return lifecycle.is("loaded", "error");
    });

    const isStable = Stability(isResolved);

    expect(isResolved()).toBe(false);
    expect(isStable.changed).toBe(false);

    lifecycle.choose("loading");
    expect(isStable.changed).toBe(false);
    expect(isResolved()).toBe(false);

    lifecycle.choose("loaded", 1);
    expect(isStable.changed).toBe(true);
    expect(isResolved()).toBe(true);

    lifecycle.choose("loaded", 2);
    expect(isStable.changed).toBe(false);
    expect(isResolved()).toBe(true);

    lifecycle.choose("error", new Error("oops"));
    expect(isStable.changed).toBe(false);
  });
});

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const debug: boolean = false;

function Stability(reactive: Tagged): {
  readonly changed: boolean;
} {
  let changed = false;

  TIMELINE.on.change(reactive, (internals) => {
    if (debug) {
      console.group(
        Tagged.description(reactive).describe(),
        "invalidated by"
      );
      console.log(internals.description.describe());
      console.groupEnd();
    }
    changed = true;
  });

  return {
    get changed() {
      const result = changed;
      changed = false;
      return result;
    },
  };
}
function Instrument<T>(
  callback: () => T
): (options: { expect: "initialized" | "changed" | "stable" }) => T;
function Instrument<T>(
  callback: () => T,
  options: { returns: "formula" }
): (options: { expect: "initialized" | "changed" | "stable" }) => Formula<T>;
function Instrument<T>(
  callback: () => T,
  options?: { returns: "formula" }
): (options: {
  expect: "initialized" | "changed" | "stable";
}) => T | Formula<T> {
  let status: "initial" | "initialized" | "changed" | "stable" = "initial";

  const formula = Formula(() => {
    if (status === "initial") {
      status = "initialized";
    } else {
      status = "changed";
    }
    return callback();
  });

  return (expectation: { expect: "initialized" | "changed" | "stable" }) => {
    const value = formula();
    expect(status).toBe(expectation.expect);
    status = "stable";

    if (options?.returns === "formula") {
      return formula;
    } else {
      return value;
    }
  };
}
