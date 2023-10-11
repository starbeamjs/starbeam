import type * as rollup from "rollup";
import type * as vite from "vite";

export interface PackageInfo {
  readonly name: string;
  readonly root: string;
  readonly main: string;
  readonly starbeam: {
    readonly external: ExternalOption[];
    readonly source: string | undefined;
    readonly jsx: string | undefined;
    readonly type: string;
    readonly entry: Record<string, string>;
  };
}

export type JsonArray = JsonValue[];
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject;

// importing from typescript using a static import massively slows down eslint for some reason.
export type CompilerOptions = import("typescript").CompilerOptions;

export type Setting<T extends keyof CompilerOptions> = CompilerOptions[T] &
  string;

export type PackageJsonInline = string | [ExternalOperator, string];

export type StarbeamKey = "inline" | "type" | "jsx";

export interface PackageJSON {
  readonly main: string;
  readonly private: boolean;
  readonly name: string;
  readonly "starbeam:inline"?: PackageJsonInline[] | undefined;
  readonly "starbeam:type"?: string | undefined;
  readonly "starbeam:jsx"?: string | undefined;
  readonly "starbeam:source"?: string | undefined;
  readonly "starbeam:entry"?: string | Record<string, string> | undefined;
  readonly starbeam?:
    | {
        readonly inline?: PackageJsonInline[] | undefined;
        readonly source?: string | undefined;
        readonly type?: string | undefined;
        readonly jsx?: string | undefined;
        readonly entry?: string | Record<string, string> | undefined;
      }
    | undefined;
}

type SimpleExternal = { [P in string]: "inline" | "external" };
type ExternalOperator = "startsWith";

export type ExternalOption =
  | SimpleExternal
  | [ExternalOperator, SimpleExternal];

export type RollupExport = rollup.RollupOptions | rollup.RollupOptions[];
export type ViteConfig = Pick<
  vite.UserConfig,
  "plugins" | "esbuild" | "optimizeDeps" | "build"
>;
export type ViteExport = ViteConfig | Promise<ViteConfig>;

export class Package {
  static root(meta: ImportMeta): string;
  static at(meta: ImportMeta | string): Package | undefined;
  static config(meta: ImportMeta | string): RollupExport;
  static viteConfig(meta: ImportMeta | string): ViteConfig;

  readonly entry: Record<string, string>;

  config(): RollupExport;
}
