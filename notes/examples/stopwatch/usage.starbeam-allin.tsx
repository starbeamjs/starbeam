import { hookify } from "@starbeam/react";
import { cell } from "starbeam";
import { Tick } from "./hook.starbeam.js";

const useTick = hookify(Tick);

export function Stopwatch({ duration }: { duration: number }) {
  let tick = cell(0);

  useTick(() => tick.update(tick.current + 1), duration);

  return <div>{tick}</div>;
}
