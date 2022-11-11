import "preact";

import type { ComponentChildren } from "preact";
import type { JSXInternal } from "preact/src/jsx.js";

export default function Card({
  children,
  class: className,
}: {
  children?: ComponentChildren;
  class?: string;
}): JSXInternal.Element {
  const classes = ["card"];
  if (className) classes.push(className);
  return <div class={classes.join(" ")}>{children}</div>;
}
