/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, render, type JSX, type ComponentChildren } from "preact";

// @ts-expect-error `?inline` URLs aren't supported by TS
import css from "./log.css?inline";

import type { DebugFilter, DebugOperation } from "@starbeam/debug";
import { TIMELINE } from "@starbeam/timeline";
import { useMemo, useState } from "preact/hooks";
import { CellConsumeLine, CellUpdateLine } from "./cell.jsx";
import { LogLine } from "./ui.jsx";
import { FrameConsumeLine } from "./frame.jsx";
import type { Timestamp } from "@starbeam/interfaces";

export interface DevtoolsLineOptions {
  root?: string;
}

export interface DevtoolsLogOptions extends DevtoolsLineOptions {
  filter?: DebugFilter;
}

export function DevtoolsLog({
  options = {},
}: {
  options?: DevtoolsLogOptions;
}): JSX.Element {
  const { filter = { type: "all" } } = options;

  const listener = useMemo(() => {
    const listener = TIMELINE.attach(
      () => {
        setLogs((prev) => [...prev, ...listener.flush()]);
      },
      { filter }
    );
    return listener;
  }, [filter]);

  const [logs, setLogs] = useState<DebugOperation[]>(listener.flush());

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
    <Pane>
      <section class="starbeam-devtools">{operations}</section>
    </Pane>
  );
}

function Pane({ children }: { children: ComponentChildren }): JSX.Element {
  return (
    <>
      <section class="pane">{children}</section>
    </>
  );
}

function LogOperation({
  line,
  prev,
  options,
}: {
  line: DebugOperation;
  prev: Timestamp | undefined;
  options: DevtoolsLineOptions;
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
  options: DevtoolsLogOptions = {}
): { update: (options: DevtoolsLogOptions) => void } {
  const app = <DevtoolsLog options={options} />;
  let shadow = into.shadowRoot;

  if (!shadow) {
    const font = document.createElement("style");
    const fonts = [
      `https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,slnt,wdth,wght,GRAD,XTRA,YTAS,YTDE@8..144,-10..0,25..151,100..1000,-200..150,323..603,649..854,-305..-98&display=swap`,
      `https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap`,
      `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`,
    ];
    font.textContent = fonts
      .map((font) => `@import url(${JSON.stringify(font)});`)
      .join("\n");
    document.body.appendChild(font);

    shadow = into.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    shadow.appendChild(style);
  }

  render(app, shadow);

  return {
    update: (newOptions: DevtoolsLogOptions) => {
      render(<DevtoolsLog options={{ ...options, ...newOptions }} />, into);
    },
  };
}
