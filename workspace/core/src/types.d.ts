import type { ExternalOperator } from "./manifest";

export type RollupExternal = boolean;

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

export type ExternalConfig = "inline" | "external";
export type SimpleExternal = Record<string, ExternalConfig>;

export type ExternalOption =
  | SimpleExternal
  | [ExternalOperator, SimpleExternal];
