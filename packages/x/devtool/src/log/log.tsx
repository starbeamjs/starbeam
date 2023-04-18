/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "preact";

import type { Timestamp } from "@starbeam/tags";
/** @jsxRuntime automatic @jsxImportSource preact */
import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";

import { CellConsumeLine, CellUpdateLine } from "./cell.js";
import css from "./css/log.css?inline";
import { FrameConsumeLine } from "./frame.js";
import type { UpdatePane } from "./pane.js";
import { Pane, UiPane } from "./pane.js";
import { LogLine } from "./ui.js";

type FIXME = any;
type DevtoolsOptions = FIXME;
type DebugOperation = FIXME;
type ATTACH = FIXME;
declare const ATTACH: ATTACH;

export function DevtoolsLog({
  options = {},
}: {
  options?: DevtoolsOptions;
}): JSX.Element {
  const { filter = { type: "all" } } = options;

  const listener = useMemo(() => {
    const listener = ATTACH.attach(
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
}: JSX.IntrinsicAttributes & {
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

    default:
      throw Error(`Unimplemented: this switch should be exhaustive`);
  }
}

export function DevtoolsLogPane(
  into: Element,
  options: DevtoolsOptions = {}
): UpdatePane<{ options: DevtoolsOptions }> {
  return Pane<{ options: DevtoolsOptions }>(into, {
    Component: DevtoolsLog,
    props: { options },
    css,
  });
}
