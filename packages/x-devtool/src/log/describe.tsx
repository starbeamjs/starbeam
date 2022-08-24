/** @jsx h */
/** @jsxFrag Fragment */
// eslint-disable-next-line
import { h, Fragment, type JSX } from "preact";

import type {
  DescriptionParts,
  DetailsPart,
  StackFrameDisplayOptions,
} from "@starbeam/interfaces";
import type { DevtoolsLineOptions } from "./log.jsx";

export function DescribeLeaf({
  leaf,
  options,
}: {
  leaf: DescriptionParts;
  options: DevtoolsLineOptions;
}): JSX.Element {
  // const frame = leaf.frame;

  // if (frame) {
  //   const parts = frame.parts(options);

  //   const root = parts.root?.name ? (
  //     <span class="root">{parts.root.name}</span>
  //   ) : null;
  //   const path = (
  //     <>
  //       {root}
  //       <span class="path">{parts.path}</span>
  //     </>
  //   );

  //   return <p class="stack">{path}</p>;
  // } else {
  //   return <></>;
  // }

  // const stack = frame ? (
  //   <>
  //     <p class="stack">
  //       {" "}
  //       {frame.display(options)}
  //       <button
  //         onClick={() => {
  //           console.log(frame.link());
  //         }}
  //         class={`stack ${leaf.type}`}
  //       >
  //         log
  //       </button>
  //     </p>
  //   </>
  // ) : null;

  return (
    <>
      <p class={`message name ${leaf.type}`}>
        <Name details={leaf.details} />
      </p>
      <Frame leaf={leaf} options={options} />
    </>
  );
}

function Frame({
  leaf,
  options,
}: {
  leaf: DescriptionParts;
  options: StackFrameDisplayOptions;
}): JSX.Element {
  const frame = leaf.frame;

  if (frame) {
    const parts = frame.parts(options);

    const root = parts.root ? (
      <span class={`root ${parts.root.name ? "" : "main"}`}>
        {parts.root.name ?? "root"}
      </span>
    ) : null;
    const path = (
      <>
        {root}
        <span class="path">{parts.path}</span>
      </>
    );

    return (
      <p class="stack">
        {path}
        <button
          onClick={() => {
            console.log(frame.link());
          }}
          class={`stack ${leaf.type}`}
        >
          log
        </button>
      </p>
    );
  } else {
    return <></>;
  }
}

export function Name({ details }: { details: DetailsPart }): JSX.Element {
  switch (details.type) {
    case "value":
      return <span class="name">{details.name}</span>;
    case "member":
      return (
        <>
          <Name details={details.parent.parts.details} />
          <span class={`${details.kind} name`}>{details.name}</span>
        </>
      );
    case "method":
      return <span class="method name">{details.name}</span>;
    case "anonymous":
      return <span class="anonymous name">anonymous</span>;
    case "detail":
      return (
        <>
          <Name details={details.parent.parts.details} />
          <span class="detail name">{details.name}</span>
        </>
      );
    default:
      exhaustive(details);
  }
}

function exhaustive(x: never): never {
  console.error("Unreachable exhaustive case", x);
  throw Error("Unreachable code (this should be a type error)");
}
