import "preact";

import type { ComponentChildren, JSX } from "preact";

export default function Card({
  children,
  class: className,
}: {
  children?: ComponentChildren;
  class?: string;
}): JSX.Element {
  const classes = ["card"];
  if (className) classes.push(className);
  return <div class={classes.join(" ")}>{children}</div>;
}
