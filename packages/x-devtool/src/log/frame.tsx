/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type JSX } from "preact";
import type { FrameConsumeOperation } from "@starbeam/debug";
import type {
  CompositeInternals,
  MutableInternals,
  Timestamp,
} from "@starbeam/interfaces";
import { LogLine, LogLineFor } from "./ui.jsx";
import type { DevtoolsOptions } from "./shared.js";
import { ReactiveInternals } from "@starbeam/timeline";
import { DescribeLeaf } from "./describe.jsx";

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

  const description = frame.description?.parts;

  if (description === undefined) {
    return (
      <LogLine at={at} prev={prev}>
        A frame was consumed, but no information about it is available.
      </LogLine>
    );
  } else {
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
}

function List({
  cells,
  change,
}: {
  cells: Set<MutableInternals>;
  change: "add" | "remove";
}) {
  if (cells.size === 0) {
    return null;
  } else {
    return (
      <>
        <div class={`change ${change}`}>
          <h3>{change}</h3>
          {[...cells].map((cell) => (
            <DescribeLeaf leaf={cell.description!.parts} options={{}} />
          ))}
        </div>
      </>
    );
  }
}

function Dependencies({ frame }: { frame: CompositeInternals }) {
  console.log(ReactiveInternals.dependencies(frame));
  return <></>;
}
