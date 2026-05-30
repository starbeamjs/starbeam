# `@starbeam-demos/table-ember`

Playable Ember (Polaris/GTS) shell for the framework-neutral inventory table
demo.

```sh
pnpm --filter @starbeam-demos/table-ember dev
```

The Ember app imports the same `@starbeam-demos/table-core` model as the React,
Preact, Vue, and Svelte demos. Its `@glimmer/component` reads the
Starbeam-backed inventory through plain getters — no `fromStarbeam` bridge. The
component renders through `@ember/renderer`'s `renderComponent`, and Starbeam's
native tag mirror makes Glimmer re-render when the shared cells change.
