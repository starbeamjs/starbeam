import "./devtool.css";

import type {
  DebugListener,
  DebugOperation,
  Description,
} from "@starbeam/debug";
import type { CellTag } from "@starbeam/interfaces";
import { getTag } from "@starbeam/tags";
import { taggedDescription } from "@starbeam/tags";
import { type Tagged, TIMELINE } from "@starbeam/runtime";
import { isPresent, verified } from "@starbeam/verify";
import { type JSX, render } from "preact";

export function DevtoolsFor(props: {
  reactive: Tagged;
  log: DebugOperation[];
}): JSX.Element {
  function computeDependencies(): Iterable<CellTag> {
    return getTag(props.reactive).dependencies();
  }

  function computeInvalidated(): CellTag[] {
    return props.log
      .map((operation) => operation.for)
      .filter(
        (value): value is CellTag =>
          value !== undefined && value.type === "cell"
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
                {taggedDescription(props.reactive).fullName}
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

function Dependency({
  description,
}: {
  description: Description;
}): JSX.Element {
  const specified = <span class="specified">{description.fullName}</span>;

  function displayLink(): void {
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

function unique(dependencies: CellTag[]): Description[] {
  const descriptions = new Set(
    dependencies.map((d) => d.description.userFacing)
  );

  return [...descriptions];
}

export default function DevtoolsPane(
  renderable: Tagged,
  log: DebugOperation[],
  into: Element
): { update: (reactive: Tagged, log: DebugOperation[]) => void } {
  const app = <DevtoolsFor reactive={renderable} log={log} />;

  render(app, into);

  return {
    update: (reactive: Tagged, log: DebugOperation[]) => {
      render(<DevtoolsFor reactive={reactive} log={log} />, into);
    },
  };
}

export function DevTools(
  listener: DebugListener,
  reactive: Tagged
): () => void {
  const pane = DevtoolsPane(
    reactive,
    listener.flush(),
    verified(document.querySelector("#devtools"), isPresent)
  );

  return () => {
    const log = listener.flush();

    pane.update(reactive, log);
  };
}
