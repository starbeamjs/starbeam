import type { browser } from "@domtree/flavors";
import { cell, hook, HookBlueprint } from "starbeam";

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

export function ComponentSize(
  element: browser.HTMLElement
): HookBlueprint<Size> {
  return hook((hook) => {
    let size = cell(getSize(element));

    let resizeObserver = new ResizeObserver(() => {
      size.update(getSize(element));
    });

    hook.onDestroy(() => resizeObserver.unobserve(element));

    return size;
  }, "ComponentSize");
}
