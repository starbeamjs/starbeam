import { defineEcConfig } from "astro-expressive-code";
import ecTwoSlash from "expressive-code-twoslash";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const repoTsconfig = fileURLToPath(
  new URL("../../tsconfig.json", import.meta.url),
);

export default defineEcConfig({
  plugins: [
    ecTwoSlash({
      cwd: repoRoot,
      tsConfigPath: repoTsconfig,
      twoslashOptions: {
        compilerOptions: {
          lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ESNext,
        },
      },
    }),
  ],
});
