// @vitest-environment jsdom

import type { Reactive } from "@starbeam/interfaces";
import { useReactive, useResource, useSetup } from "@starbeam/react";
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
  // This is a test helper, not a React component or hook. The react-compiler
  // project runs with `compilationMode: "all"`, which would otherwise wrap
  // this factory in `_c(N)` memoization — and `_c` throws outside a React
  // render. Opt out explicitly. See docs/INVARIANTS.md §17.
  "use no memo";
  return Formula(() => {
    events.record("read");
    return cell.read();
  });
}

// ---------------------------------------------------------------------------
// useReactive
// ---------------------------------------------------------------------------

testReact<void, number>(
  "§14: useReactive(() => reactive.current) — fresh activation per strict-mode render",
  async (root, mode) => {
    const cell = Cell(INITIAL);
    const events = new RecordedEvents();
    const tracked = trackedFormula(events, cell);

    await root
      .expectHTML((value) => `<p>${value}</p>`)
      .render((state) => {
        const value = useReactive(() => tracked.current);
        state.value(value);
        return html.p(String(value));
      });

    mode.match({
      // Strict mode: 3 reads — one per activation (R1 discarded, R2
      // committed, post-layout remount). The formula evaluates once
      // per activation; the consumer reads its value once per render.
      strict: () => void events.expect("read", "read", "read"),
      // Loose mode: 1 activation, 1 read.
      loose: () => void events.expect("read"),
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
      strict: () =>
        void events.expect(
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
// useSetup
// ---------------------------------------------------------------------------

testReact<void, number>(
  "§14: useSetup(blueprint) — blueprint runs per activation",
  async (root, mode) => {
    const events = new RecordedEvents();

    await root
      .expectHTML(() => `<p>ok</p>`)
      .render((state) => {
        const value = useSetup(() => {
          events.record("setup");
          return INITIAL;
        });
        state.value(value);
        return html.p("ok");
      });

    mode.match({
      // Strict mode's first mount runs the blueprint three times:
      //
      //   1. R1's render: blueprint runs via `useInitializedRef`'s
      //      initial path. React will discard this render; no layout
      //      effect commits for it.
      //   2. R2's render: blueprint runs again via the `isUpdate &&
      //      state === mounting` rebuild added in PR #163. React will
      //      commit this render.
      //   3. Strict mode's mandatory remount cycle: layout cleanup
      //      fires on the committed instance, then layout fires again
      //      with `state === unmounted` and rebuilds the instance via
      //      the remount path, running the blueprint once more.
      //
      // Matches `resource-stages.spec.ts` baseline, which asserts the
      // same `setup, setup, …, setup` sequence around the `sync` /
      // `cleanup` / `finalize` events that a Resource blueprint adds
      // on top.
      //
      // How this maps to INVARIANTS §14/§15's "setup runs once per
      // logical activation" is an open interpretation — §15 ties
      // "activation" to effect commit/destruction, under which R1's
      // setup is a wasted call (no committed effects to pair with) and
      // R2 + remount are the two pairable activations. PR #163
      // introduces the R1→R2 rebuild deliberately, treating the
      // discarded render as its own "fresh reactive identity" —
      // observable behavior is consistent either way because R1's
      // instance is unreachable after React discards the render.
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
