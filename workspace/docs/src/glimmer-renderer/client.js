// Astro client renderer for Glimmer (`.gts`) islands.
//
// Mirrors the `@astrojs/vue` / `@astrojs/svelte` client factory shape:
//
//   (element) => async (Component, props, slotted, { client }) => { ... }
//
// Importing `@starbeam/ember` installs the Starbeam -> Glimmer tag bridge as a
// side effect (`installStarbeamTags()`), so plain Glimmer getters that read the
// shared Starbeam model re-render when the model changes.
import "@starbeam/ember";

import { renderComponent } from "@ember/renderer";

const rendered = new WeakMap();

export default (element) => async (Component) => {
  // `client:only` islands never SSR, so there is no hydration markup to
  // adopt; `renderComponent` replaces the element's contents on first render.
  if (rendered.has(element)) {
    return;
  }

  const result = renderComponent(Component, { into: element, owner: {} });

  rendered.set(element, result);

  element.addEventListener(
    "astro:unmount",
    () => {
      result.destroy();
      rendered.delete(element);
    },
    { once: true },
  );
};
