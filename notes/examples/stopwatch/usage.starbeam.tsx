import { hookify } from "@starbeam/react";
import { useState } from "react";
import { Tick } from "./hook.starbeam.js";

const useStopwatch = hookify(Tick);

export function StopwatchComponent({ duration }: { duration: number }) {
  let [tick, setTick] = useState(0);

  useStopwatch(() => setTick((tick) => tick + 1), duration);

  return <div>{tick}</div>;
}
