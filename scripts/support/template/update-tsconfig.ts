import type { Migrator } from "../json-editor/migration.js";
import { UpdatePackageFn } from "./updates.js";

/**
 * Unfortunately, this is not exposed in a useful/viable way from the typescript package.
 */
export interface TsConfig {
  extends?: string;
  include?: string[];
  exclude?: string[];
  files?: string[];
  references?: { path: string }[];
  compilerOptions?: {
    module?: string;
    moduleResolution?: string;
    moduleDetection?: string;
    newLine?: string;
    importsNotUsedAsValues?: string;
    jsx?: string;
    target?: string;
    allowJs?: boolean;
    allowSyntheticDefaultImports?: boolean;
    allowUmdGlobalAccess?: boolean;
    allowUnreachableCode?: boolean;
    allowUnusedLabels?: boolean;
    alwaysStrict?: boolean;
    baseUrl?: string;
    charset?: string;
    checkJs?: boolean;
    declaration?: boolean;
    declarationMap?: boolean;
    emitDeclarationOnly?: boolean;
    declarationDir?: string;
    disableSizeLimit?: boolean;
    disableSourceOfProjectReferenceRedirect?: boolean;
    disableSolutionSearching?: boolean;
    disableReferencedProjectLoad?: boolean;
    downlevelIteration?: boolean;
    emitBOM?: boolean;
    emitDecoratorMetadata?: boolean;
    exactOptionalPropertyTypes?: boolean;
    experimentalDecorators?: boolean;
    forceConsistentCasingInFileNames?: boolean;
    importHelpers?: boolean;
    inlineSourceMap?: boolean;
    inlineSources?: boolean;
    isolatedModules?: boolean;
    keyofStringsOnly?: boolean;
    lib?: string[];
    locale?: string;
    mapRoot?: string;
    maxNodeModuleJsDepth?: number;
    moduleSuffixes?: string[];
    noEmit?: boolean;
    noEmitHelpers?: boolean;
    noEmitOnError?: boolean;
    noErrorTruncation?: boolean;
    noFallthroughCasesInSwitch?: boolean;
    noImplicitAny?: boolean;
    noImplicitReturns?: boolean;
    noImplicitThis?: boolean;
    noStrictGenericChecks?: boolean;
    noUnusedLocals?: boolean;
    noUnusedParameters?: boolean;
    noImplicitUseStrict?: boolean;
    noPropertyAccessFromIndexSignature?: boolean;
    assumeChangesOnlyAffectDirectDependencies?: boolean;
    noLib?: boolean;
    noResolve?: boolean;
    noUncheckedIndexedAccess?: boolean;
    out?: string;
    outDir?: string;
    outFile?: string;
    paths?: Record<string, string[]>;
    preserveConstEnums?: boolean;
    noImplicitOverride?: boolean;
    preserveSymlinks?: boolean;
    preserveValueImports?: boolean;
    project?: string;
    reactNamespace?: string;
    jsxFactory?: string;
    jsxFragmentFactory?: string;
    jsxImportSource?: string;
    composite?: boolean;
    incremental?: boolean;
    tsBuildInfoFile?: string;
    removeComments?: boolean;
    rootDir?: string;
    rootDirs?: string[];
    skipLibCheck?: boolean;
    skipDefaultLibCheck?: boolean;
    sourceMap?: boolean;
    sourceRoot?: string;
    strict?: boolean;
    strictFunctionTypes?: boolean;
    strictBindCallApply?: boolean;
    strictNullChecks?: boolean;
    strictPropertyInitialization?: boolean;
    stripInternal?: boolean;
    suppressExcessPropertyErrors?: boolean;
    suppressImplicitAnyIndexErrors?: boolean;
    traceResolution?: boolean;
    useUnknownInCatchVariables?: boolean;
    resolveJsonModule?: boolean;
    types?: string[];
    /** Paths used to compute primary types search locations */
    typeRoots?: string[];
    esModuleInterop?: boolean;
    useDefineForClassFields?: boolean;
  };
}

export const updateTsconfig = UpdatePackageFn((updater, { workspace }) => {
  const { path, pkg } = updater;
  updater.json.migrator("tsconfig.json", (migrator: Migrator<TsConfig>) => {
    migrator
      .remove("compilerOptions.emitDeclarationOnly")
      .add(
        "compilerOptions.types",
        path.relative(workspace.paths.packages.file("env")),
        { matches: (type) => type.endsWith("/env") }
      );

    if (updater.pkg.type.is("demo:react")) {
      const devtool = path.relative(
        workspace.paths.packages.x.dir("devtool").file("tsconfig.json")
      );

      const packages = path.relative(
        workspace.paths.packages.file("tsconfig.packages.json")
      );

      migrator
        .add(
          "references",
          { path: devtool },
          { matches: (ref) => ref.path === devtool }
        )
        .add(
          "references",
          { path: packages },
          { matches: (ref) => ref.path === packages }
        );
    }

    if (updater.pkg.tsconfig) {
      migrator.set(
        "extends",
        path.relative(
          workspace.root.file(`.config/tsconfig/${updater.pkg.tsconfig}`)
        ),
        "start"
      );
      migrator.set(
        "extends",
        path.relative(
          workspace.root.file(`.config/tsconfig/${updater.pkg.tsconfig}`)
        ),
        "start"
      );
    } else if (
      updater.pkg.type.is(
        "library",
        "interfaces",
        "tests",
        "support:tests",
        "support:build"
      )
    ) {
      migrator.set(
        "extends",
        path.relative(
          workspace.root.file(".config/tsconfig/tsconfig.shared.json")
        ),
        "start"
      );
    } else if (pkg.type.is("demo:react")) {
      migrator.set(
        "extends",
        path.relative(
          workspace.root.file(`.config/tsconfig/tsconfig.react-demo.json`)
        ),
        "start"
      );
    } else if (pkg.type.is("root")) {
      // do nothing
    } else {
      workspace.reporter.fatal(`${pkg.root} is an unknown type: ${pkg.type}`);
    }

    migrator
      .set("compilerOptions.composite", true)
      .set(
        "compilerOptions.outDir",
        path.relative(workspace.root.dir(`dist/packages`))
      )
      .set("compilerOptions.declaration", true)
      .set(
        "compilerOptions.declarationDir",
        path.relative(workspace.root.dir(`dist/types`))
      )
      .set("compilerOptions.declarationMap", true)
      .add("exclude", "dist/**/*");
  });
});
