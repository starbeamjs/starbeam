/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type JSX } from "preact";
import type { LeafDebugOperation } from "@starbeam/debug";
import type { MutableInternals, Timestamp } from "@starbeam/interfaces";
import { LogLine, LogLineFor } from "./ui.jsx";
import type { DevtoolsLineOptions } from "./log.jsx";

export function FrameConsumeLine({
  line,
  prev,
  options,
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
        A frame was consumed, but no information about it is available.
      </LogLine>
    );
  } else {
    return (
      <LogLineFor
        at={at}
        prev={prev}
        what="frame"
        operation="consume"
        parts={description}
        options={options}
      />
    );
  }
}
