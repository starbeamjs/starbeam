/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, render } from "preact";
import "./src/devtool.css";

import { Reactive } from "@starbeam/core";
import {
  type Pollable,
  TIMELINE,
  type MutableInternals,
  type ReactiveInternals,
} from "@starbeam/timeline";
import type {
  Description,
  DebugListener,
  DebugOperation,
} from "@starbeam/debug";

export function Devtools(props: {
  renderable: ReactiveInternals;
  log: DebugOperation[];
}) {
  function computeDependencies() {
    return props.renderable.children().dependencies;
  }

  function computeInvalidated() {
    return props.log
      .map((operation) => operation.for)
      .filter(
        (value): value is MutableInternals =>
          value !== undefined && value.type === "mutable"
      );
  }

  const invalidated = computeInvalidated();

  return (
    <>
      <details class="starbeam-devtool">
        <summary>🧑‍💻</summary>
        <section class="dependencies">
          <ul class="dependencies">
            <li>
              <span class="specified">description</span>
              <span class="kind">{props.renderable.description.fullName}</span>
            </li>
            <li>
              <span class="specified">last updated</span>
              <span class="kind">{String(TIMELINE.now)}</span>
            </li>
          </ul>
          <h1>Dependencies</h1>
          <ul class="dependencies">
            {unique([...computeDependencies()]).map((d) => (
              <li>
                <Dependency description={d} />
              </li>
            ))}
          </ul>
          <h1>Last Invalidated</h1>
          <ul class="dependencies">
            {invalidated.length ? (
              unique(invalidated).map((d) => (
                <li>
                  <Dependency description={d} />
                </li>
              ))
            ) : (
              <li>None</li>
            )}
          </ul>
        </section>
      </details>
    </>
  );
}

function Dependency({ description }: { description: Description }) {
  const specified = <span class="specified">{description.fullName}</span>;

  function displayLink() {
    if (description.fullName) {
      console.log(
        "%c%s @ %s",
        "color:red",
        description.fullName,
        description.frame?.display
      );
    } else {
      console.log("%c%s", "color:red", description.frame?.display);
    }
  }

  return (
    <>
      {specified}
      <button type="button" onClick={displayLink}>
        log {description.type} location
      </button>
    </>
  );
}

function unique(dependencies: MutableInternals[]): Description[] {
  const descriptions = new Set(
    dependencies.map((d) => d.description.userFacing)
  );

  return [...descriptions];
}

export default function DevtoolsPane(
  renderable: ReactiveInternals,
  log: DebugOperation[],
  into: Element
) {
  const app = <Devtools renderable={renderable} log={log} />;

  render(app, into);

  return {
    update: (renderable: ReactiveInternals, log: DebugOperation[]) => {
      render(<Devtools renderable={renderable} log={log} />, into);
    },
  };
}

export function DevTools(
  listener: DebugListener,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pollable: Pollable
): () => void {
  const pane = DevtoolsPane(
    Reactive.internals(pollable),
    listener.flush(),
    document.querySelector("#devtools") as Element
  );

  return () => {
    const log = listener.flush();

    pane.update(Reactive.internals(pollable), log);
  };
}
