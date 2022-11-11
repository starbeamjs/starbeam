import { isPresentArray } from "@starbeam/core-utils";

import type { Migrator } from "../json-editor/migration.js";
import { StarbeamType } from "../unions.js";
import { UpdatePackageFn } from "./updates.js";

export class TypeScriptConfig {
  readonly #config: TsConfig;

  constructor(config: TsConfig) {
    this.#config = config;
  }

  get includes(): string[] | undefined {
    const includes = [];

    if (this.#config.include) {
      includes.push(...this.#config.include);
    }

    if (this.#config.files) {
      includes.push(...this.#config.files);
    }

    if (isPresentArray(includes)) {
      return includes;
    }
  }
}

/**
 * Unfortunately, this is not exposed in a useful/viable way from the typescript package.
 */
export interface TsConfig {
  extends?: string | undefined;
  include?: string[] | undefined;
  exclude?: string[] | undefined;
  files?: string[] | undefined;
  references?: { path: string }[] | undefined;
  compilerOptions?:
    | {
        module?: string | undefined;
        moduleResolution?: string | undefined;
        moduleDetection?: string | undefined;
        newLine?: string | undefined;
        importsNotUsedAsValues?: string | undefined;
        jsx?: string | undefined;
        target?: string | undefined;
        allowJs?: boolean | undefined;
        allowSyntheticDefaultImports?: boolean | undefined;
        allowUmdGlobalAccess?: boolean | undefined;
        allowUnreachableCode?: boolean | undefined;
        allowUnusedLabels?: boolean | undefined;
        alwaysStrict?: boolean | undefined;
        baseUrl?: string | undefined;
        charset?: string | undefined;
        checkJs?: boolean | undefined;
        declaration?: boolean | undefined;
        declarationMap?: boolean | undefined;
        emitDeclarationOnly?: boolean | undefined;
        declarationDir?: string | undefined;
        disableSizeLimit?: boolean | undefined;
        disableSourceOfProjectReferenceRedirect?: boolean | undefined;
        disableSolutionSearching?: boolean | undefined;
        disableReferencedProjectLoad?: boolean | undefined;
        downlevelIteration?: boolean | undefined;
        emitBOM?: boolean | undefined;
        emitDecoratorMetadata?: boolean | undefined;
        exactOptionalPropertyTypes?: boolean | undefined;
        experimentalDecorators?: boolean | undefined;
        forceConsistentCasingInFileNames?: boolean | undefined;
        importHelpers?: boolean | undefined;
        inlineSourceMap?: boolean | undefined;
        inlineSources?: boolean | undefined;
        isolatedModules?: boolean | undefined;
        keyofStringsOnly?: boolean | undefined;
        lib?: string[] | undefined;
        locale?: string | undefined;
        mapRoot?: string | undefined;
        maxNodeModuleJsDepth?: number | undefined;
        moduleSuffixes?: string[] | undefined;
        noEmit?: boolean | undefined;
        noEmitHelpers?: boolean | undefined;
        noEmitOnError?: boolean | undefined;
        noErrorTruncation?: boolean | undefined;
        noFallthroughCasesInSwitch?: boolean | undefined;
        noImplicitAny?: boolean | undefined;
        noImplicitReturns?: boolean | undefined;
        noImplicitThis?: boolean | undefined;
        noStrictGenericChecks?: boolean | undefined;
        noUnusedLocals?: boolean | undefined;
        noUnusedParameters?: boolean | undefined;
        noImplicitUseStrict?: boolean | undefined;
        noPropertyAccessFromIndexSignature?: boolean | undefined;
        assumeChangesOnlyAffectDirectDependencies?: boolean | undefined;
        noLib?: boolean | undefined;
        noResolve?: boolean | undefined;
        noUncheckedIndexedAccess?: boolean | undefined;
        out?: string | undefined;
        outDir?: string | undefined;
        outFile?: string | undefined;
        paths?: Record<string, string[]> | undefined;
        preserveConstEnums?: boolean | undefined;
        noImplicitOverride?: boolean | undefined;
        preserveSymlinks?: boolean | undefined;
        preserveValueImports?: boolean | undefined;
        project?: string | undefined;
        reactNamespace?: string | undefined;
        jsxFactory?: string | undefined;
        jsxFragmentFactory?: string | undefined;
        jsxImportSource?: string | undefined;
        composite?: boolean | undefined;
        incremental?: boolean | undefined;
        tsBuildInfoFile?: string | undefined;
        removeComments?: boolean | undefined;
        rootDir?: string | undefined;
        rootDirs?: string[] | undefined;
        skipLibCheck?: boolean | undefined;
        skipDefaultLibCheck?: boolean | undefined;
        sourceMap?: boolean | undefined;
        sourceRoot?: string | undefined;
        strict?: boolean | undefined;
        strictFunctionTypes?: boolean | undefined;
        strictBindCallApply?: boolean | undefined;
        strictNullChecks?: boolean | undefined;
        strictPropertyInitialization?: boolean | undefined;
        stripInternal?: boolean | undefined;
        suppressExcessPropertyErrors?: boolean | undefined;
        suppressImplicitAnyIndexErrors?: boolean | undefined;
        traceResolution?: boolean | undefined;
        useUnknownInCatchVariables?: boolean | undefined;
        resolveJsonModule?: boolean | undefined;
        types?: string[] | undefined;
        /** Paths used to compute primary types search locations */
        typeRoots?: string[] | undefined;
        esModuleInterop?: boolean | undefined;
        useDefineForClassFields?: boolean | undefined;
      }
    | undefined;
}

export const updateTsconfig = UpdatePackageFn(
  (updater, { workspace, paths }) => {
    const { path, pkg } = updater;
    updater.json.migrate("tsconfig.json", (migrator: Migrator<TsConfig>) => {
      migrator
        .remove("compilerOptions.emitDeclarationOnly")
        .array("compilerOptions.types", (update) =>
          update.add(path(paths.packages.file("env")).fromPackageRoot, {
            matches: (type) => type.endsWith("/env"),
          })
        );

      if (updater.pkg.type.isType("demo")) {
        const devtool = path(
          workspace.paths.packages.x.dir("devtool").file("tsconfig.json")
        ).fromPackageRoot;

        const packages = path(
          paths.packages.file("tsconfig.packages.json")
        ).fromPackageRoot;

        migrator
          .array("references", (update) =>
            update.add(...reference(devtool)).add(...reference(packages))
          )
          .array("include", (update) =>
            update
              .add("index.ts")
              .add("src/**/*")
              .add("vite.config.ts")
              .remove("vite.config.js")
          );
      }

      if (updater.pkg.tsconfig) {
        migrator.set(
          "extends",
          path(workspace.root.file(`.config/tsconfig/${updater.pkg.tsconfig}`))
            .fromPackageRoot,
          "start"
        );
        migrator.set(
          "extends",
          path(workspace.root.file(`.config/tsconfig/${updater.pkg.tsconfig}`))
            .fromPackageRoot,
          "start"
        );
      } else if (
        updater.pkg.type.isType("library") ||
        updater.pkg.type.is("tests")
      ) {
        migrator.set(
          "extends",
          path(workspace.root.file(".config/tsconfig/tsconfig.shared.json"))
            .fromPackageRoot,
          "start"
        );
      } else if (pkg.type.isType("demo")) {
        migrator.set(
          "extends",
          updater.path(
            workspace.root.file(
              `.config/tsconfig/tsconfig.${pkg.type.subtype}-demo.json`
            )
          ).fromPackageRoot,
          "start"
        );

        if (pkg.type.is("demo:preact")) {
          migrator.addTo("compilerOptions.types", "preact");
        }
      } else if (pkg.type.is("root")) {
        // do nothing
      } else {
        workspace.reporter.fatal(
          `${String(pkg.root)} is an unknown type: ${String(
            pkg.type
          )}.\n\nIt should be one of:\n\n${StarbeamType.format()}`
        );
      }

      migrator
        .set("compilerOptions.composite", true)
        .set(
          "compilerOptions.outDir",
          path(workspace.root.dir(`dist/packages`)).fromPackageRoot
        )
        .set("compilerOptions.declaration", true)
        .set(
          "compilerOptions.declarationDir",
          path(workspace.root.dir(`dist/types`)).fromPackageRoot
        )
        .set("compilerOptions.declarationMap", true)
        .addTo("exclude", "dist/**/*");

      return migrator.write();
    });
  }
);

function reference<T extends string>(
  to: T
): [{ path: T }, { matches: (ref: { path: T }) => boolean }] {
  return [{ path: to }, { matches: ({ path }) => path === to }];
}
