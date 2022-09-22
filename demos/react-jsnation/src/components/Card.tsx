import type { ReactNode } from "react";

export default function Card({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  return <div className="card">{children}</div>;
}
