import { isPresentArray } from "@starbeam/core-utils";

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
