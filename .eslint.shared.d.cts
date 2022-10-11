import type { Linter } from "eslint";

export type TypescriptConfig = Linter.Config & {
  excludedFiles?: string | string[];
  files?: string | string[];
  ts?: Linter.RulesRecord;
};

export const rules: Linter.BaseConfig;

export const typescript: (tsconfigPath: string, config?: TypescriptConfig) => Linter.Config;