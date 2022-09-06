/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type JSX } from "preact";

import type { Timestamp, MutableInternals } from "@starbeam/interfaces";
import { LogLine, LogLineFor, title } from "./ui.jsx";
import { Internal } from "./describe.jsx";
import type { DevtoolsLineOptions } from "./log.jsx";
import type {
  CellConsumeOperation,
  CellUpdateOperation,
} from "@starbeam/debug";

export function CellConsumeLine({
  line,
  prev,
  options = {},
}: {
  line: CellConsumeOperation;
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
      <>
        <LogLineFor
          at={at}
          prev={prev}
          what="cell"
          operation="consume"
          parts={description}
          options={options}
        />
      </>
    );
  }
}

export function CellUpdateLine({
  line,
  prev,
  options = {},
}: {
  line: CellUpdateOperation;
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
      <LogLineFor
        at={at}
        prev={prev}
        what="cell"
        operation="update"
        parts={description}
        options={options}
      />
    );
  }
}
