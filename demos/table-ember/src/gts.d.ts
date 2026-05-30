// Glimmer template (`.gts`) modules are compiled by the Embroider/Babel
// template-compilation pipeline at build time. Full template-aware type
// checking lives in Glint (`@glint/ember-tsc`); plain `tsc` only needs to know
// that each `.gts` file default-exports a Glimmer component class.
declare module "*.gts" {
  import type Component from "@glimmer/component";

  const component: new (...args: never[]) => Component;
  export default component;
}
