import "preact";

import { isPresentArray, isSingleItemArray } from "@starbeam/core-utils";
import type { ComponentChildren, JSX } from "preact";
/** @jsxRuntime automatic @jsxImportSource preact */
type FIXME = any;
type DevtoolsOptions = FIXME;
type DescriptionParts = FIXME;
type StackFrameDisplayOptions = FIXME;
type DetailsPart = FIXME;

export function DescribeLeaf({
  leaf,
  options,
}: {
  leaf: DescriptionParts;
  options: DevtoolsOptions;
}): JSX.Element {
  const userFacing = leaf.userFacing.parts;

  return (
    <>
      <p class={`message name ${userFacing.type}`}>
        <Name details={userFacing.details} options={options} />
      </p>
    </>
  );
}

export function Internal({
  leaf,
  label,
  options,
}: {
  leaf: DescriptionParts;
  label?: string | undefined;
  options: DevtoolsOptions;
}): JSX.Element | null {
  if (leaf.internal) {
    return (
      <>
        <div class="log-line internals">
          <div class="content">
            <span
              class="what"
              aria-label={label ? `internal: ${label}` : `internal`}
              data-icon="visibility_off"
            />

            <p class={`message name ${leaf.type}`}>
              <span class="detail implementation reason">
                {leaf.internal.reason}
              </span>
            </p>
          </div>
          <Frame leaf={leaf} options={options} />
        </div>{" "}
      </>
    );
  } else {
    return null;
  }
}

export function Frame({
  leaf,
  options,
  expand,
}: {
  leaf: DescriptionParts;
  options: StackFrameDisplayOptions;
  expand?: ComponentChildren;
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
        <button
          onClick={() => {
            console.log(frame.link({ complete: true }));
          }}
          class={`stack ${leaf.type}`}
        >
          full stack
        </button>
        <button
          onClick={() => {
            console.log(leaf);
          }}
          class={`stack ${leaf.type}`}
        >
          debug
        </button>
        {expand}
      </p>
    );
  } else {
    return <></>;
  }
}

export function Name({
  details,
  options,
  head,
  more,
}: {
  details: DetailsPart;
  options: DevtoolsOptions;
  head?: boolean;
  more?: boolean;
}): JSX.Element {
  const headClass = head ? "head" : "";
  const tailClass = more ? "" : "tail";
  const classes = `${headClass} ${tailClass}`;

  switch (details.type) {
    case "value":
      return <span class={`name ${classes}`}>{details.name}</span>;
    case "member":
      return (
        <>
          <Name
            details={details.parent.parts.details}
            more={true}
            options={options}
          />
          <span class={`${details.kind} ${classes} name`}>{details.name}</span>
        </>
      );
    case "method":
      return <span class="method name ${classes}">{details.name}</span>;
    case "anonymous":
      return <span class="anonymous name ${classes}">anonymous</span>;
    case "detail": {
      if (isSingleItemArray(details.args)) {
        const [arg] = details.args;

        return (
          <>
            <Name
              details={details.parent.parts.details}
              more={true}
              options={options}
            />
            <span class={`detail key name ${classes}`}>{arg}</span>
          </>
        );
      } else if (isPresentArray(details.args)) {
        return (
          <>
            <Name
              details={details.parent.parts.details}
              more={true}
              options={options}
            />
            <span class={`detail key name ${classes}`}>{details.name}</span>;
          </>
        );
      } else {
        return (
          <>
            <Name
              details={details.parent.parts.details}
              more={true}
              options={options}
            />
            <span class={`detail method name ${classes}`}>{details.name}</span>
            <span class={`detail args ${classes}`}>
              {details.args?.join(", ")}
            </span>
          </>
        );
      }
    }
    default:
      exhaustive(details as never);
  }
}

function exhaustive(x: never): never {
  console.error("Unreachable exhaustive case", x);
  throw Error("Unreachable code (this should be a type error)");
}
