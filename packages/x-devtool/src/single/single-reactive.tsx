import { render, type JSX } from "preact";
import "./devtool.css";

import { ReactiveProtocol, TIMELINE } from "@starbeam/timeline";
import {
  type Description,
  type DebugListener,
  type DebugOperation,
  defaultDescription,
} from "@starbeam/debug";
import type { MutableInternals } from "@starbeam/interfaces";

export function DevtoolsFor(props: {
  reactive: ReactiveProtocol;
  log: DebugOperation[];
}): JSX.Element {
  function computeDependencies() {
    return ReactiveProtocol.dependencies(props.reactive);
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
              <span class="kind">
                {ReactiveProtocol.description(props.reactive).fullName}
              </span>
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
        description.frame?.display()
      );
    } else {
      console.log("%c%s", "color:red", description.frame?.display());
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
    dependencies.map((d) => d.description?.userFacing ?? defaultDescription)
  );

  return [...descriptions];
}

export default function DevtoolsPane(
  renderable: ReactiveProtocol,
  log: DebugOperation[],
  into: Element
): { update: (reactive: ReactiveProtocol, log: DebugOperation[]) => void } {
  const app = <DevtoolsFor reactive={renderable} log={log} />;

  render(app, into);

  return {
    update: (reactive: ReactiveProtocol, log: DebugOperation[]) => {
      render(<DevtoolsFor reactive={reactive} log={log} />, into);
    },
  };
}

export function DevTools(
  listener: DebugListener,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reactive: ReactiveProtocol
): () => void {
  const pane = DevtoolsPane(
    reactive,
    listener.flush(),
    document.querySelector("#devtools") as Element
  );

  return () => {
    const log = listener.flush();

    pane.update(reactive, log);
  };
}
