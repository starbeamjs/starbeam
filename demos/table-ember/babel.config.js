import { buildMacros } from "@embroider/macros/babel";

const macros = buildMacros();

export default {
  plugins: [
    [
      "@babel/plugin-transform-typescript",
      {
        allExtensions: true,
        onlyRemoveTypeImports: true,
        allowDeclareFields: true,
      },
    ],
    [
      "babel-plugin-ember-template-compilation",
      {
        transforms: [...macros.templateMacros],
        targetFormat: "wire",
      },
    ],
    [
      "module:decorator-transforms",
      {
        // Resolve the decorator runtime helpers to the ESM build explicitly.
        // The plugin's default runtime import doesn't resolve in this Vite
        // dev pipeline, so the emitted `dt7948` helper throws at runtime
        // without this. (Redundant in rollup/embroider builds, load-bearing
        // here.)
        runtime: {
          import: import.meta.resolve("decorator-transforms/runtime-esm"),
        },
      },
    ],
    ...macros.babelMacros,
    [
      "@babel/plugin-transform-runtime",
      {
        absoluteRuntime: import.meta.dirname,
        useESModules: true,
        regenerator: false,
      },
    ],
  ],

  generatorOpts: {
    compact: false,
  },
};
