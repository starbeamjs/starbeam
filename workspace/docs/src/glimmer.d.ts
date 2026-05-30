// Glimmer template (`.gts`) modules are compiled at build time by the local
// `@starbeam/astro-glimmer` integration (Embroider + Babel). Astro's type
// checker does not know the `.gts` extension, so declare the two shapes the
// docs import: the default-exported Glimmer component, and the `?raw` source
// string used to render the source card.
declare module "*.gts" {
  // The default export is a Glimmer component compiled at build time. Astro's
  // JSX checker treats unknown component shapes as `never` for the `client:*`
  // directives, so the export is typed loosely to let the custom
  // `client:only="gts"` renderer accept it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: any;
  export default component;
}

declare module "*.gts?raw" {
  const source: string;
  export default source;
}
