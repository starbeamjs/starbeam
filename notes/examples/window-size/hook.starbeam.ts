import { JSDOM } from "jsdom";
import { Universe } from "starbeam";

const universe = Universe.jsdom(new JSDOM());

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

export default universe.hook((hook) => {
  const size = universe.cell(getSize());

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
