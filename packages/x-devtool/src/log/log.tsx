/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type ComponentChildren, type JSX } from "preact";

// @ts-expect-error `?inline` URLs aren't supported by TS
import css from "./css/log.css?inline";

import type { DebugOperation } from "@starbeam/debug";
import type { Timestamp } from "@starbeam/interfaces";
import { TIMELINE } from "@starbeam/timeline";
import { useMemo, useState } from "preact/hooks";
import { CellConsumeLine, CellUpdateLine } from "./cell.jsx";
import { FrameConsumeLine } from "./frame.jsx";
import { Pane, UiPane, type UpdatePane } from "./pane.jsx";
import type { DevtoolsOptions } from "./shared.js";
import { LogLine } from "./ui.jsx";

export function DevtoolsLog({
  options = {},
}: {
  options?: DevtoolsOptions;
}): JSX.Element {
  const { filter = { type: "all" } } = options;

  const listener = useMemo(() => {
    const listener = TIMELINE.attach(
      () => {
        setLogs((prev) => [...listener.flush().reverse(), ...prev]);
      },
      { filter }
    );
    return listener;
  }, [filter]);

  const [logs, setLogs] = useState<DebugOperation[]>(
    listener.flush().reverse()
  );

  const operations: JSX.Element[] = [];
  let prevTimestamp: Timestamp | undefined;

  logs.forEach((operation, i) => {
    operations.push(
      <LogOperation
        key={i}
        line={operation}
        prev={prevTimestamp}
        options={options}
      />
    );

    prevTimestamp = operation.at;
  });

  return (
    <UiPane>
      <section class="starbeam-devtools">{operations}</section>
    </UiPane>
  );
}

function LogOperation({
  line,
  prev,
  options,
}: {
  line: DebugOperation;
  prev: Timestamp | undefined;
  options: DevtoolsOptions;
}): JSX.Element {
  switch (line.type) {
    case "cell:consume":
      return <CellConsumeLine prev={prev} line={line} options={options} />;

    case "cell:update":
      return <CellUpdateLine prev={prev} line={line} options={options} />;

    case "frame:consume":
      return <FrameConsumeLine prev={prev} line={line} options={options} />;

    case "mutation":
      return <LogLine>Unimplemented mutation log</LogLine>;
  }
}

export function DevtoolsLogPane(
  into: Element,
  options: DevtoolsOptions = {}
): UpdatePane<{ options: DevtoolsOptions }> {
  return Pane(into, {
    Component: DevtoolsLog,
    props: { options },
    css,
  });
}
