/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, render } from "preact";
import "./src/devtool.css";

import { useEffect, useRef, useState } from "preact/hooks";
import type { MutableInternals, Renderable } from "@starbeam/timeline";
import type { Description } from "@starbeam/debug";

export function Devtools(props: { renderable: Renderable<unknown> }) {
  const [dependencies, setDependencies] = useState([] as MutableInternals[]);
  const [invalidated, setInvalidated] = useState(
    null as MutableInternals[] | null
  );

  const last = useRef<{
    renderable: Renderable<unknown>;
    cleanup: () => void;
  } | null>(null);

  useEffect(() => {
    if (props.renderable === last.current?.renderable) {
      return;
    }

    if (last.current) {
      last.current.cleanup();
    }

    const [deps, cleanup] = props.renderable.dev({
      dependencies: ({ dependencies }) => {
        setDependencies(dependencies);
      },
      invalidated: ({ dependencies }) => {
        setInvalidated(dependencies.length > 0 ? dependencies : null);
      },
    });

    setDependencies(deps);

    last.current = { renderable: props.renderable, cleanup };

    return cleanup;
  }, [props.renderable]);

  return (
    <>
      <div class="starbeam-devtool">
        <section>
          <h1>Dependencies</h1>
          <ul>
            {unique(dependencies).map((d) => (
              <li>{d.describe()}</li>
            ))}
          </ul>
        </section>

        <section>
          <h1>Last Invalidated</h1>
          <ul>
            {invalidated ? (
              unique(invalidated).map((d) => <li>{d.describe()}</li>)
            ) : (
              <li>None</li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}

function unique(dependencies: MutableInternals[]): Description[] {
  const descriptions = new Set(
    dependencies.map((d) => d.description.userFacing())
  );

  return [...descriptions];
}

export default function DevtoolsPane(
  renderable: Renderable<any>,
  into: Element
) {
  const app = <Devtools renderable={renderable} />;

  render(app, into);

  return {
    update: (renderable: Renderable<unknown>) => {
      render(<Devtools renderable={renderable} />, into);
    },
  };
}
