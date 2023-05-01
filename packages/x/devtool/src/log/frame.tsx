/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/** @jsxRuntime automatic @jsxImportSource preact */

import { logReactive } from "@starbeam/debug";
import type { CellTag } from "@starbeam/interfaces";
import type { Timestamp } from "@starbeam/tags";
import type { JSX } from "preact";

import { DescribeLeaf } from "./describe.js";
import { LogLineFor } from "./ui.js";

type FIXME = any;
type FrameConsumeOperation = FIXME;
type DevtoolsOptions = FIXME;

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  logReactive(frame);

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
  cells: Set<CellTag>;
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
            <DescribeLeaf leaf={cell.description as FIXME} options={{}} />
          ))}
        </div>
      </>
    );
  }
}
