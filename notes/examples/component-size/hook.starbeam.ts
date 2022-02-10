import type { browser } from "@domtree/flavors";
import { JSDOM } from "jsdom";
import { HookBlueprint, Universe } from "starbeam";

interface Size {
  width: number;
  height: number;
}

function getSize(el: browser.HTMLElement) {
  return {
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

const universe = Universe.jsdom(new JSDOM());

export function ComponentSize(
  element: browser.HTMLElement
): HookBlueprint<Size> {
  return universe.hook((hook) => {
    let size = universe.cell(getSize(element));

    let resizeObserver = new ResizeObserver(() => {
      size.update(getSize(element));
    });

    hook.onDestroy(() => resizeObserver.unobserve(element));

    return size;
  }, "ComponentSize");
}
