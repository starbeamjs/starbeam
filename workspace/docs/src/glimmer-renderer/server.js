// Minimal server entrypoint for the Glimmer renderer.
//
// Astro requires every renderer to register a `serverEntrypoint`, even when the
// component is only ever used with `client:only` (which never runs on the
// server). Glimmer components are rendered entirely on the client through
// `@ember/renderer`, so this renderer reports that it cannot server-render any
// component: `check` always returns `false`. Astro then treats matching islands
// as client-only and hands them to `client.js` in the browser.

function check() {
  return false;
}

function renderToStaticMarkup() {
  return { html: "" };
}

export default {
  name: "gts",
  check,
  renderToStaticMarkup,
};
