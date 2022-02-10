import { JSDOM } from "jsdom";
import { Reactive, Universe } from "starbeam";

const universe = Universe.jsdom(new JSDOM());

export function Stopwatch(
  callback: Reactive<() => void>,
  duration: Reactive<number>
) {
  return universe.hook((hook) => {
    let timer = setInterval(() => callback.current(), duration.current);

    hook.onDestroy(() => clearInterval(timer));

    return Reactive.from(undefined);
  }, "stopwatch");
}
