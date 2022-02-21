import type { browser } from "@domtree/flavors";
import { Cell, Hook, HookBlueprint } from "@starbeam/core";

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
  return Hook((hook) => {
    let size = Cell(getSize(element));

    let resizeObserver = new ResizeObserver(() => {
      size.update(getSize(element));
    });

    hook.onDestroy(() => resizeObserver.unobserve(element));

    return size;
  }, "ComponentSize");
}
