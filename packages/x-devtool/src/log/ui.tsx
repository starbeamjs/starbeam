/** @jsx h */
/** @jsxFrag Fragment */
import { Timestamp } from "@starbeam/timeline";
// eslint-disable-next-line
import { type ComponentChildren, type JSX, Fragment, h, render } from "preact";

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
  let timestamp: string | undefined;

  if (at) {
    if (!prev || !prev.eq(at)) {
      timestamp = String(Timestamp.debug(at).at);
    } else {
      timestamp = "";
    }
  } else {
    timestamp = "?";
  }

  return (
    <div class="log-line">
      <span class="timestamp">{timestamp}</span>
      <span
        class="what"
        aria-label={title(what, operation) ?? undefined}
        data-icon={icon(what, operation)}
      ></span>
      {children}
    </div>
  );
}

function title(what?: string, operation?: string): string | void {
  if (what === "cell" && operation === "consume") {
    return "cell consumed";
  }

  if (what === "cell" && operation === "update") {
    return "cell updated";
  }

  if (what === "frame" && operation === "consume") {
    return "frame consumed";
  }
}

function icon(what?: string, operation?: string) {
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
