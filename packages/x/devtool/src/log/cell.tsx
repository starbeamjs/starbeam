/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "preact";

import type { Timestamp } from "@starbeam/tags";
/** @jsxRuntime automatic @jsxImportSource preact */
// import type {
//   CellConsumeOperation,
//   CellUpdateOperation,
// } from "@starbeam/debug";
import type { JSX } from "preact";

// import type { DevtoolsOptions } from "./shared.js";
import { LogLineFor } from "./ui.js";

type FIXME = any;
type CellConsumeOperation = FIXME;
type DevtoolsOptions = FIXME;
type CellUpdateOperation = FIXME;

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
  const cell = line.for;

  const description = cell.description.parts;

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
  const cell = line.for;

  const description = cell.description.parts;

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
