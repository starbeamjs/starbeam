import { Cell, Hook } from "@starbeam/core";

interface WindowSize {
  innerHeight: number;
  innerWidth: number;
  outerHeight: number;
  outerWidth: number;
}

function getSize(): WindowSize {
  return {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    outerHeight: window.outerHeight,
    outerWidth: window.outerWidth,
  };
}

export default Hook((hook) => {
  const size = Cell(getSize());

  let teardown = initialize((signal) =>
    window.addEventListener("resize", () => size.update(getSize()), {
      signal,
    })
  );

  hook.onDestroy(teardown);

  return size;
}, "WindowSize");

function initialize(callback: (signal: AbortSignal) => void): () => void {
  let controller = new AbortController();
  callback(controller.signal);

  return () => controller.abort();
}
