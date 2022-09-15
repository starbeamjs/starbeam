/** @jsxRuntime automatic @jsxImportSource preact */

import type {
  CellConsumeOperation,
  CellUpdateOperation,
} from "@starbeam/debug";
import type { MutableInternals, Timestamp } from "@starbeam/interfaces";
import type { JSX } from "preact";

import type { DevtoolsOptions } from "./shared.js";
import { LogLine, LogLineFor } from "./ui.jsx";

export function CellConsumeLine({
  line,
  prev,
  options = {},
}: {
  line: CellConsumeOperation;
  prev: Timestamp | undefined;
  options: DevtoolsOptions;
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
  options: DevtoolsOptions;
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
