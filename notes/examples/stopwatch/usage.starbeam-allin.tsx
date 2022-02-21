import { Cell } from "@starbeam/core";
import { hookify } from "@starbeam/react";
import { Tick } from "./hook.starbeam.js";

const useTick = hookify(Tick);

export function Stopwatch({ duration }: { duration: number }) {
  let tick = Cell(0);

  useTick(() => tick.update(tick.current + 1), duration);

  return <div>{tick}</div>;
}
