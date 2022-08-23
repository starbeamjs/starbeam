/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type JSX } from "preact";

import type { LeafDebugOperation } from "@starbeam/debug";
import type { Timestamp, MutableInternals } from "@starbeam/interfaces";
import { LogLine } from "./ui.jsx";
import { DescribeLeaf } from "./describe.jsx";
import type { DevtoolsLineOptions } from "./log.jsx";

export function CellConsumeLine({
  line,
  prev,
  options = {},
}: {
  line: LeafDebugOperation;
  prev: Timestamp | undefined;
  options: DevtoolsLineOptions;
}): JSX.Element {
  const at = line.at;
  const cell = line.for as MutableInternals;

  const description = cell.description?.parts;

  if (description === undefined) {
    return (
      <LogLine at={at} prev={prev}>
        A cell was consumed, but no information about it is available.
      </LogLine>
    );
  } else {
    return (
      <LogLine at={at} prev={prev} what="cell" operation="consume">
        <DescribeLeaf leaf={description} options={options} />
      </LogLine>
    );
  }
}

export function CellUpdateLine({
  line,
  prev,
  options = {},
}: {
  line: LeafDebugOperation;
  prev: Timestamp | undefined;
  options: DevtoolsLineOptions;
}): JSX.Element {
  const at = line.at;
  const cell = line.for as MutableInternals;

  const description = cell.description?.parts;

  if (description === undefined) {
    return (
      <LogLine at={at} prev={prev}>
        A cell was updated, but no information about it is available.
      </LogLine>
    );
  } else {
    return (
      <LogLine at={at} prev={prev} what="cell" operation="update">
        <DescribeLeaf leaf={description} options={options} />
      </LogLine>
    );
  }
}
