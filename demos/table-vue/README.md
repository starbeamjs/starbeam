# `@starbeam-demos/table-vue`

Playable Vue shell for the framework-neutral inventory table demo.

```sh
pnpm --filter @starbeam-demos/table-vue dev
```

The Vue app imports the same `@starbeam-demos/table-core` model as the React and
Preact demos. Its single-file component calls `useReactive()` during setup, then
reads the Starbeam-backed inventory directly from the template.
