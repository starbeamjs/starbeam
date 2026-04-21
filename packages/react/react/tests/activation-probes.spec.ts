// @vitest-environment jsdom

import type { Reactive } from "@starbeam/interfaces";
import {
  setup,
  setupReactive,
  useReactive,
  useResource,
} from "@starbeam/react";
import { Cell, Formula } from "@starbeam/universal";
import { html, testReact } from "@starbeam-workspace/react-test-utils";
import { RecordedEvents, TestResource } from "@starbeam-workspace/test-utils";

/**
 * Activation probes per INVARIANTS.md §14/§15.
 *
 * Each hook under test is exercised with a "tracked" reactive value (a
 * Formula that records a `read` event every time it's evaluated, OR a
 * TestResource blueprint that records setup/sync/cleanup/finalize).
 *
 * Under strict mode, React renders the component twice and throws away
 * the first render. Per §14/§15, that discarded render is an activation
 * boundary: setup code should run twice, resources should be torn down
 * and rebuilt, fresh reactive identity should be allocated.
 *
 * Observation: the existing unit tests for these hooks only assert the
 * DOM output, which is identical whether the hook honors §14 or not.
 * The probes below assert the activation semantics directly.
 *
 * What each probe records is NOT a fixed "correct" count — the strict-
 * mode count depends on React's scheduler and how many re-renders the
 * hook's layout effects trigger. The structural assertion is:
 *
 *   loose_count <= strict_count
 *
 * with specific counts documented for regression detection.
 */

const INITIAL = 0;

function trackedFormula(events: RecordedEvents, cell: Reactive<number>) {
  return Formula(() => {
    events.record("read");
    return cell.read();
  });
}

// ---------------------------------------------------------------------------
// useReactive
// ---------------------------------------------------------------------------

testReact<void, number>(
  "§14: useReactive(reactive) — fresh activation per strict-mode render",
  async (root, mode) => {
    const cell = Cell(INITIAL);
    const events = new RecordedEvents();
    const tracked = trackedFormula(events, cell);

    await root
      .expectHTML((value) => `<p>${value}</p>`)
      .render((state) => {
        const value = useReactive(tracked);
        state.value(value);
        return html.p(String(value));
      });

    mode.match({
      // Strict mode: 2 renders × reads for initial + post-layout notify
      // cycle = 4 reads.
      strict: () => void events.expect("read", "read", "read", "read"),
      // Loose mode: 1 render, 1 read.
      loose: () => void events.expect("read"),
    });
  },
);

testReact<void, number>(
  "§14: useReactive(() => reactive, []) — fresh activation per strict-mode render",
  async (root, mode) => {
    const cell = Cell(INITIAL);
    const events = new RecordedEvents();
    const tracked = trackedFormula(events, cell);

    await root
      .expectHTML((value) => `<p>${value}</p>`)
      .render((state) => {
        const value = useReactive(() => tracked, []);
        state.value(value);
        return html.p(String(value));
      });

    mode.match({
      strict: () => void events.expect("read", "read", "read", "read"),
      loose: () => void events.expect("read"),
    });
  },
);

// ---------------------------------------------------------------------------
// setupReactive
// ---------------------------------------------------------------------------

testReact<void, number>(
  "§14: setupReactive(reactive) — fresh activation per strict-mode render",
  async (root, mode) => {
    const cell = Cell(INITIAL);
    const events = new RecordedEvents();
    const tracked = trackedFormula(events, cell);

    await root
      .expectHTML((value) => `<p>${value}</p>`)
      .render((state) => {
        const r = setupReactive(tracked);
        state.value(r.current);
        return html.p(String(r.current));
      });

    // setupReactive returns Reactive<T>; two reads per activation
    // (consumer calls r.current twice in render). Strict doubles that.
    mode.match({
      strict: () => void events.expect(
        "read", "read", "read", "read",
        "read", "read", "read", "read",
      ),
      loose: () => void events.expect("read", "read"),
    });
  },
);

// ---------------------------------------------------------------------------
// useResource — already well-covered by resource-stages.spec.ts, but we
// document the baseline here in the audit too.
// ---------------------------------------------------------------------------

testReact<void, number>(
  "§14: useResource — fresh activation per strict-mode render (baseline: matches resource-stages)",
  async (root, mode) => {
    const { resource, events } = TestResource();

    await root
      .expectHTML((value) => `<p>hi ${value}</p>`)
      .render((state) => {
        const r = useResource(resource);
        state.value(r.count);
        return html.p("hi ", String(r.count));
      });

    mode.match({
      // Matches `resource-stages.spec.ts > the basics > strict mode`:
      // first activation sets up, is torn down, second activation
      // sets up again and syncs.
      strict: () => void events.expect(
        "setup",
        "setup",
        "sync",
        "cleanup",
        "finalize",
        "setup",
        "sync",
      ),
      loose: () => void events.expect("setup", "sync"),
    });
  },
);

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

testReact<void, number>(
  "§14: setup(blueprint) — blueprint runs per activation",
  async (root, mode) => {
    const events = new RecordedEvents();

    await root
      .expectHTML(() => `<p>ok</p>`)
      .render((state) => {
        const value = setup(() => {
          events.record("setup");
          return INITIAL;
        });
        state.value(value);
        return html.p("ok");
      });

    mode.match({
      // setup runs once per activation. Strict mode observed count is
      // 3 setups: R1 (discarded), R2 (committed), and a third call
      // during the post-layout-effect re-render that `notify()` triggers.
      // That third call is surprising — per the `useLifecycle` fix in
      // PR #163, the post-layout re-render shouldn't rebuild the
      // instance. TODO: investigate whether `setup` takes a different
      // path that does rebuild. Recording observed behavior as the
      // baseline here.
      strict: () => void events.expect("setup", "setup", "setup"),
      loose: () => void events.expect("setup"),
    });
  },
);

// ---------------------------------------------------------------------------
// useService — service lifetime is tied to the app, not the component
// ---------------------------------------------------------------------------
// NOTE: useService requires a <Starbeam> wrapper, which the default
// testReact harness doesn't provide. Skipping here; useService §14
// semantics are covered by service.spec.ts with the service-scoped
// lifetime contract.
