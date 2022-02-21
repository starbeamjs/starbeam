import { Hook, Reactive } from "@starbeam/core";

export function Tick(
  callback: Reactive<() => void>,
  duration: Reactive<number>
) {
  return Hook((hook) => {
    let timer = setInterval(() => callback.current(), duration.current);

    hook.onDestroy(() => clearInterval(timer));

    return Reactive.from(undefined as void);
  }, "stopwatch");
}

// export function Tick(
//   callback,
//   duration
// ) {
//   return hook((hook) => {
//     let timer = setInterval(() => callback.current(), duration.current);

//     hook.onDestroy(() => clearInterval(timer));
//   }, "stopwatch");
// }
