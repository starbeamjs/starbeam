/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/** @jsxRuntime automatic @jsxImportSource preact */

import type { Timestamp } from "@starbeam/tags";
import type { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";

import { DescribeLeaf, Frame, Internal } from "./describe.js";

type FIXME = any;
type DevtoolsOptions = FIXME;
type DescriptionParts = FIXME;

function Line({
  timestamp,
  label,
  icon,
  content,
  frame,
}: {
  timestamp: string;
  label?: string | undefined;
  icon: string | undefined;
  content?: ComponentChildren | undefined;
  frame?: ComponentChildren | undefined;
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
  at?: Timestamp | undefined;
  prev?: Timestamp | undefined;
  what?: string | undefined;
  operation?: string | undefined;
  children?: ComponentChildren | undefined;
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
  at?: Timestamp | undefined;
  prev?: Timestamp | undefined;
  what?: string | undefined;
  operation?: string | undefined;
  parts: DescriptionParts;
  options: DevtoolsOptions;
}): JSX.Element {
  const [showInternal, setShowInternal] = useState(false);

  let expand;

  if (parts.internal) {
    expand = (
      <button
        class="stack"
        onClick={() => {
          setShowInternal((prev) => !prev);
        }}
      >
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
    if (prev?.at !== current.at) {
      return String(current.at);
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
