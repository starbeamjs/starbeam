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
        compilerPath: "ember-source/dist/ember-template-compiler.js",
        transforms: [...macros.templateMacros],
        targetFormat: "wire",
      },
    ],
    [
      "module:decorator-transforms",
      {
        runtime: {
          import: import.meta.resolve("decorator-transforms/runtime-esm"),
        },
      },
    ],
    [
      "babel-plugin-debug-macros",
      {
        flags: [
          {
            source: "@glimmer/env",
            flags: { DEBUG: true, CI: false },
          },
        ],
        debugTools: {
          isDebug: true,
          source: "@ember/debug",
          assertPredicateIndex: 1,
        },
        externalizeHelpers: { module: "@ember/debug" },
      },
      "@ember/debug stripping",
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
