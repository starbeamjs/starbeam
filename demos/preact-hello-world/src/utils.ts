import type { JSX } from "preact/jsx-runtime";

export type EventHandler<
  E extends Element,
  K extends keyof JSX.DOMAttributes<E>
> = JSX.DOMAttributes<E>[K];
