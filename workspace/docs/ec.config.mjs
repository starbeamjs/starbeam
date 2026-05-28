import { defineEcConfig } from "astro-expressive-code";
import ecTwoSlash from "expressive-code-twoslash";
import ts from "typescript";

const DEMO_TYPES = `
import type { Inventory } from "@starbeam-demos/table-core";
export const inventory: Inventory;
export function resetInventory(): void;
`;

export default defineEcConfig({
  plugins: [
    ecTwoSlash({
      instanceConfigs: {
        twoslash: {
          explicitTrigger: true,
          languages: ["ts", "tsx"],
        },
      },
      twoslashOptions: {
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          strict: true,
          target: ts.ScriptTarget.ESNext,
        },
        handbookOptions: {
          noErrors: true,
          noErrorValidation: true,
        },
        extraFiles: {
          "demos/table-react/src/demo.d.ts": DEMO_TYPES,
          "demos/table-preact/src/demo.d.ts": DEMO_TYPES,
          "demo.d.ts": DEMO_TYPES,
          "node_modules/@starbeam/collections/index.d.ts": `
export const reactive: {
  Map<K, V>(description?: string): Map<K, V>;
};
`,
          "node_modules/@starbeam/react/index.d.ts": `
import type { DependencyList } from "react";
export function useReactive<T>(callback: () => T, dependencies?: DependencyList): T;
`,
        },
      },
    }),
  ],
});
