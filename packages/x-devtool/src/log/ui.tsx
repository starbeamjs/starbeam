/** @jsx h */
/** @jsxFrag Fragment */
import type { DescriptionParts } from "@starbeam/debug";
import { Timestamp } from "@starbeam/timeline";
// eslint-disable-next-line
import { type ComponentChildren, type JSX, Fragment, h, render } from "preact";
import { useState } from "preact/hooks";

import { DescribeLeaf, Frame, Internal } from "./describe.jsx";
import type { DevtoolsOptions } from "./shared.js";

function Line({
  timestamp,
  label,
  icon,
  content,
  frame,
}: {
  timestamp: string;
  label?: string;
  icon: string;
  content?: ComponentChildren;
  frame?: ComponentChildren;
}): JSX.Element {
  return (
    <div class="log-line">
      <span class="timestamp">{timestamp}</span>
      <div class="content">
        <span class="what" aria-label={label} data-icon={icon}></span>
        {content}
      </div>
      {frame}
    </div>
  );
}

export function LogLine({
  at,
  prev,
  what,
  operation,
  children,
}: {
  at?: Timestamp;
  prev?: Timestamp;
  what?: string;
  operation?: string;
  children?: ComponentChildren;
}): JSX.Element {
  return (
    <Line
      timestamp={timestamp(at, prev)}
      label={title(what, operation) ?? undefined}
      icon={icon(what, operation)}
      content={children}
    />
  );
}

export function LogLineFor({
  at,
  prev,
  what,
  operation,
  parts,
  options,
}: {
  at?: Timestamp;
  prev?: Timestamp;
  what?: string;
  operation?: string;
  parts: DescriptionParts;
  options: DevtoolsOptions;
}): JSX.Element {
  const [showInternal, setShowInternal] = useState(false);

  let expand;

  if (parts.internal) {
    expand = (
      <button class="stack" onClick={() => setShowInternal((prev) => !prev)}>
        {showInternal ? "Hide" : "Show"} internals
      </button>
    );
  }

  return (
    <>
      <Line
        timestamp={timestamp(at, prev)}
        icon={icon(what, operation)}
        label={title(what, operation) ?? undefined}
        content={<DescribeLeaf leaf={parts} options={options} />}
        frame={<Frame leaf={parts} options={options} expand={expand} />}
      />
      {showInternal ? (
        <Internal
          label={title("cell", "consume")}
          leaf={parts}
          options={options}
        />
      ) : null}
    </>
  );
}

function timestamp(
  current: Timestamp | undefined,
  prev: Timestamp | undefined
): string {
  if (current) {
    if (!prev || !prev.eq(current)) {
      return String(Timestamp.debug(current).at);
    } else {
      return "";
    }
  } else {
    return "?";
  }
}

export function title(what?: string, operation?: string): string | undefined {
  if (what === "cell" && operation === "consume") {
    return "cell consumed";
  }

  if (what === "cell" && operation === "update") {
    return "cell updated";
  }

  if (what === "frame" && operation === "consume") {
    return "frame consumed";
  }

  return undefined;
}

export function icon(what?: string, operation?: string): string {
  if (what === "cell" && operation === "consume") {
    return "visibility";
  }

  if (what === "cell" && operation === "update") {
    return "edit";
  }

  if (what === "frame" && operation === "consume") {
    return "preview";
  }

  return "question_mark";
}
