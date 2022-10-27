import type { Linter, ESLint } from "eslint";
import type { FlatConfigItem, FlatConfigObject } from "./eslint-flat.js";

export type TypescriptConfig = Partial<FlatConfigObject> & {
  files: string | string[];
  ignores?: string | string[] | undefined;
  ts?: Linter.RulesRecord | undefined;
  tight?: boolean | undefined;
};

export const STRICT_RULES: Linter.BaseConfig;
export const BASE_RULES: Linter.BaseConfig;

export const lintTypescript: (
  root: string,
  tsconfigPath: string,
  config?: TypescriptConfig
) => FlatConfigItem[]
