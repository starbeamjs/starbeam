# `@starbeam-demos/table-preact`

Playable Preact shell for the framework-neutral inventory table demo.

```sh
pnpm --filter @starbeam-demos/table-preact dev
```

The Preact app imports the same `@starbeam-demos/table-core` model as the React
demo. Components read the Starbeam-backed inventory directly during render;
`@starbeam/preact` tracks those render reads after the adapter is installed.
