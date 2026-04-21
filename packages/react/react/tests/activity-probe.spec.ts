// @vitest-environment jsdom

import { useResource } from "@starbeam/react";
import type { RenderState } from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { TestResource } from "@starbeam-workspace/test-utils";
import { Activity, createElement } from "react";

/**
 * Activity probe per INVARIANTS.md §14/§15.
 *
 * `<Activity mode="visible" | "hidden">` is React's primitive for hiding
 * a subtree without unmounting it. Effects are destroyed when hidden
 * and re-created when visible. Per §14/§15, this maps directly to
 * Starbeam's activation/deactivation boundary: hidden = deactivate,
 * visible = activate.
 *
 * This probe asserts the baseline: a `TestResource` inside an Activity
 * boundary runs `setup → sync` on initial reveal, tears down via
 * `cleanup → finalize` on hide, and runs `setup → sync` again on the
 * next reveal.
 */

testReact<{ mode: "visible" | "hidden" }, number>(
  "<Activity>: resource teardown and re-activation across hide/show",
  async (root, mode) => {
    const { resource, events } = TestResource();

    function Inner(props: { state: RenderState<number> }): React.ReactElement {
      const r = useResource(resource);
      props.state.value(r.count);
      return html.p("count=", String(r.count));
    }

    let expectedHTML: (props: { mode: "visible" | "hidden" }) => string = (
      props,
    ) =>
      props.mode === "hidden"
        ? `<p style="display: none;">count=0</p>`
        : `<p>count=0</p>`;

    const result = await root
      // React's Activity sets `display: none` on the child when hidden
      // and leaves `style=""` after re-showing (an artifact of React's
      // style-clearing strategy). We allow the test to adjust the
      // expectation across phases.
      .expectHTML((_value, props) => expectedHTML(props))
      .render(
        (state, props) =>
          // Call createElement directly; `react.render` overloads don't
          // accept `Activity`'s ExoticComponent type because ActivityProps
          // requires `children` in the props object.
          createElement(
            Activity,
            { mode: props.mode, children: react.render(Inner, { state }) },
          ),
        { mode: "visible" },
      );

    mode.match({
      // Strict mode: activation arc fires twice before layout settles
      // (R1 discarded, R2 committed) — same sequence as
      // resource-stages.spec.ts baseline.
      strict: () => {
        events.expect(
          "setup",
          "setup",
          "sync",
          "cleanup",
          "finalize",
          "setup",
          "sync",
        );
      },
      loose: () => void events.expect("setup", "sync"),
    });

    // Hide the subtree. Observed (2026-04-21): React fires cleanup and
    // finalize (effects destroyed), but ALSO re-renders the subtree
    // one more time under hide, which invokes Starbeam's `setup`
    // blueprint again. No `sync` follows because layout effects don't
    // fire for a hidden subtree.
    //
    // This is a surprising observation: Starbeam's resource allocates
    // new state during the hide transition even though it can never
    // run (no layout commit). The allocation will be torn down when
    // the subtree shows again — but the blueprint callback still runs
    // inside the transition to hidden. Worth investigating.
    await result.rerender({ mode: "hidden" });
    mode.match({
      strict: () => void events.expect("cleanup", "finalize", "setup", "setup"),
      loose: () => void events.expect("cleanup", "finalize", "setup"),
    });

    // After the hide transition, React's style attribute is left as
    // an empty string (style="") rather than being removed. The DOM
    // content is still there — only the style representation changed.
    expectedHTML = () => `<p style="">count=0</p>`;

    // Show again. Observed (2026-04-21): React runs a full re-activation
    // cycle on show, including a strict-mode-style double-activation in
    // strict mode. The key property — §15 is honored, new sync happens
    // after the show — holds. The specific event count reflects how
    // aggressively React re-activates under Activity.
    await result.rerender({ mode: "visible" });
    mode.match({
      strict: () =>
        void events.expect(
          "setup",
          "setup",
          "setup",
          "sync",
          "cleanup",
          "finalize",
          "setup",
          "sync",
        ),
      loose: () => void events.expect("setup", "setup", "sync"),
    });
  },
);
