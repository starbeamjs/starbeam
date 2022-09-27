export interface PackageInfo {
  readonly name: string;
  readonly root: string;
  readonly main: string;
  readonly starbeamExternal: ExternalOption[];
}

// importing from typescript using a static import massively slows down eslint for some reason.
export type CompilerOptions = import("typescript").CompilerOptions;

export type Setting<T extends keyof CompilerOptions> = unknown & CompilerOptions[T] &
  string;

import { type Plugin, type RollupOptions } from "rollup";

export type PackageJsonInline = string | [ExternalOperator, string];

export interface PackageJSON {
  readonly main: string;
  readonly private: boolean;
  readonly name: string;
  readonly "starbeam:inline"?: PackageJsonInline[];
  readonly "starbeam:type"?: string;
  readonly starbeam?: {
    readonly inline?: PackageJsonInline[];
    readonly type?: string;
  };
}

type SimpleExternal = { [P in string]: "inline" | "external" };
type ExternalOperator = "startsWith";

export type ExternalOption =
  | SimpleExternal
  | [ExternalOperator, SimpleExternal];

export type RollupExport = RollupOptions | RollupOptions[];

export class Package {
  static root(meta: ImportMeta): string;
  static at(meta: ImportMeta | string): Package | undefined;
  static config(meta: ImportMeta | string): RollupExport;

  config(): RollupExport;
}
