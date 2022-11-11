import type { ComponentChildren, JSX } from "preact";

export default function Card({
  children,
}: {
  children?: ComponentChildren;
}): JSX.Element {
  return <div className="card">{children}</div>;
}
