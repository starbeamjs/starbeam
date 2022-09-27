import chalk from "chalk";
import { Migrator } from "../json-editor/migration.js";
import type { Workspace } from "../workspace.js";
import type { UpdatePackage } from "./update-package.js";

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

export function updateTsconfig(
  updater: UpdatePackage,
  workspace: Workspace
): void {
  const editor = updater.jsonEditor("tsconfig.json");

  const migrator = new Migrator<TsConfig>(editor);

  migrator
    .remove("compilerOptions.emitDeclarationOnly")
    .add(
      "compilerOptions.types",
      updater.relative(workspace.paths.packages.file("env")),
      { matches: (type) => type.endsWith("/env") }
    );

  if (updater.type === "demo:react") {
    const devtool = updater.relative(
      workspace.paths.packages.x.dir("devtool").file("tsconfig.json")
    );

    const packages = updater.relative(
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

  if (updater.tsconfig) {
    migrator.set(
      "extends",
      updater.relative(
        workspace.root.file(`.config/tsconfig/${updater.tsconfig}`)
      ),
      "start"
    );
    migrator.set(
      "extends",
      updater.relative(
        workspace.root.file(`.config/tsconfig/${updater.tsconfig}`)
      ),
      "start"
    );
  } else if (
    updater.type === "library" ||
    updater.type === "interfaces" ||
    updater.type === "support:tests"
  ) {
    migrator.set(
      "extends",
      updater.relative(
        workspace.root.file(".config/tsconfig/tsconfig.shared.json")
      ),
      "start"
    );
  } else if (updater.type === "demo:react") {
    migrator.set(
      "extends",
      updater.relative(
        workspace.root.file(`.config/tsconfig/tsconfig.react-demo.json`)
      ),
      "start"
    );
  } else {
    updater.error((root) =>
      console.error(chalk.red(`${root} is an unknown type: ${updater.type}`))
    );
    process.exit(1);
  }

  migrator
    .set("compilerOptions.composite", true)
    .set(
      "compilerOptions.outDir",
      updater.relative(workspace.root.dir(`dist/packages`))
    )
    .set("compilerOptions.declaration", true)
    .set(
      "compilerOptions.declarationDir",
      updater.relative(workspace.root.dir(`dist/types`))
    )
    .set("compilerOptions.declarationMap", true)
    .add("exclude", "dist/**/*");

  const changed = migrator.write();

  if (changed) {
    updater.change(changed, "tsconfig.json");
  }
}
