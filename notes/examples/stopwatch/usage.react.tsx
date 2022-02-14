import { useState } from "react";
import { useTick } from "./hook.react.js";

export function Stopwatch({ duration }: { duration: number }) {
  let [tick, setTick] = useState(0);

  useTick(() => setTick((tick) => tick + 1), duration);

  return <div>{tick}</div>;
}
