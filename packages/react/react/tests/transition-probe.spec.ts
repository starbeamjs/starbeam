/* eslint-disable @typescript-eslint/no-magic-numbers -- probe counts */
// @vitest-environment jsdom

import { useReactive } from "@starbeam/react";
import { Cell } from "@starbeam/universal";
import { html, testReact } from "@starbeam-workspace/react-test-utils";
import { RecordedEvents } from "@starbeam-workspace/test-utils";
import { startTransition, useTransition } from "react";

/**
 * Transition probe: does Starbeam's scheduler participate in React 18+
 * transitions?
 *
 * React 19 docs establish that `startTransition(fn)` marks as "transition"
 * only those state updates that happen *synchronously* within `fn`:
 *
 *   https://react.dev/reference/react/useTransition — "The function you
 *   pass to startTransition must be synchronous. You can't mark an update
 *   as a Transition [from] setTimeout, for example."
 *
 * Starbeam's current scheduler (see
 * `packages/react/react/src/hooks/lifecycle.ts`) pokes a `setState({})`
 * from inside a `useEffect` callback — which fires asynchronously, after
 * the `startTransition` call frame has exited. If that's the observable
 * behavior, writing a cell from inside `startTransition` will NOT produce
 * a transition-flagged re-render; `isPending` will never become true.
 *
 * This probe captures which observable actually holds. It does NOT assert
 * correctness — it documents reality. Either outcome is the current
 * behavior; the design conversation downstream will decide whether it
 * matches user expectations.
 */

testReact<void, { count: number; isPending: boolean }>(
  "transitions: cell write inside startTransition",
  async (root, mode) => {
    const cell = Cell(0);
    const events = new RecordedEvents();

    const result = await root
      .expectHTML(({ count, isPending }) => {
        const pending = isPending ? " pending" : "";
        return `<p>${count}${pending}</p>`;
      })
      .render((state) => {
        const count = useReactive(cell);
        const [isPending] = useTransition();

        events.record(`render:count=${count},isPending=${isPending}`);

        state.value({ count, isPending });

        return html.p(String(count) + (isPending ? " pending" : ""));
      });

    // Sanity: initial render observed. Under strict mode, 2 renders
    // happen; under loose, 1. Both leave isPending=false.
    mode.match({
      strict: () => {
        events.expect(
          "render:count=0,isPending=false",
          "render:count=0,isPending=false",
          "render:count=0,isPending=false",
          "render:count=0,isPending=false",
        );
      },
      loose: () => {
        events.expect("render:count=0,isPending=false");
      },
    });

    // Write the cell from inside startTransition.
    startTransition(() => {
      cell.current = 1;
    });

    // Give React a chance to process the update.
    await result.rerender();

    // The meaningful assertion: no render ever has `isPending=true`.
    // The cell update is visible (count=1), proving the write reached
    // the component, but the transition tag was never set.
    //
    // Observed counts (2026-04-21):
    //   strict mode: 4 renders at count=1 (strict double × layout notify)
    //   loose mode:  2 renders at count=1 (initial + layout notify)
    // Both with isPending=false throughout.
    //
    // If the scheduler ever starts to participate in transitions, this
    // probe will need to be revised to assert a transition-tagged
    // render appears in the sequence.
    mode.match({
      strict: () => {
        events.expect(
          "render:count=1,isPending=false",
          "render:count=1,isPending=false",
          "render:count=1,isPending=false",
          "render:count=1,isPending=false",
        );
      },
      loose: () => {
        events.expect(
          "render:count=1,isPending=false",
          "render:count=1,isPending=false",
        );
      },
    });
  },
);
