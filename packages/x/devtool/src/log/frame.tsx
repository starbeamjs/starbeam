/** @jsxRuntime automatic @jsxImportSource preact */

import type { FrameConsumeOperation } from "@starbeam/debug";
import type { MutableInternals, Timestamp } from "@starbeam/interfaces";
import { ReactiveInternals } from "@starbeam/timeline";
import type { JSX } from "preact";

import { DescribeLeaf } from "./describe.js";
import type { DevtoolsOptions } from "./shared.js";
import { LogLineFor } from "./ui.js";

export function FrameConsumeLine({
  line,
  prev,
  options,
}: {
  line: FrameConsumeOperation;
  prev: Timestamp | undefined;
  options: DevtoolsOptions;
}): JSX.Element {
  const at = line.at;
  const frame = line.for;
  console.log(line.diff);
  ReactiveInternals.log(frame);

  const description = frame.description.parts;

  const { add, remove } = line.diff;

  // TODO: Internals should have IDs so we can use them as keys and link to them.
  // TODO: Style diff correctly.

  return (
    <>
      <LogLineFor
        at={at}
        prev={prev}
        what="frame"
        operation="consume"
        parts={description}
        options={options}
      />
      <List change="add" cells={add} />
      <List change="remove" cells={remove} />
    </>
  );
}

const EMPTY_SET = 0;

function List({
  cells,
  change,
}: {
  cells: Set<MutableInternals>;
  change: "add" | "remove";
}): JSX.Element | null {
  if (cells.size === EMPTY_SET) {
    return null;
  } else {
    return (
      <>
        <div class={`change ${change}`}>
          <h3>{change}</h3>
          {[...cells].map((cell) => (
            <DescribeLeaf leaf={cell.description.parts} options={{}} />
          ))}
        </div>
      </>
    );
  }
}
