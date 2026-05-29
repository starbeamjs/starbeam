# `@starbeam-demos/table-svelte`

Playable Svelte shell for the framework-neutral inventory table demo.

```sh
pnpm --filter @starbeam-demos/table-svelte dev
```

The Svelte app imports the same `@starbeam-demos/table-core` model as the React,
Preact, and Vue demos. Its single-file component reads the Starbeam-backed
inventory through `fromStarbeam(...).current`, which bridges Starbeam reactivity
into Svelte 5 runes.
