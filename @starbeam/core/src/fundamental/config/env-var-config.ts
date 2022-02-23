import type { InferReturn } from "@starbeam/fundamental";
import { assert, exhaustive } from "@starbeam/verify";
import {
  ConfigEnvironment,
  type ConfigEnvironmentDelegate,
  type StarbeamInsertion,
  type StarbeamParse,
} from "./config.js";

export class EnvVarConfig
  implements ConfigEnvironmentDelegate<NodeJS.ProcessEnv>
{
  static create(): EnvVarConfig {
    return new EnvVarConfig();
  }

  hasConfig(): boolean {
    return "process" in globalThis && !!globalThis.process.env;
  }

  getConfig(): NodeJS.ProcessEnv {
    assert(
      "process" in globalThis && !!globalThis.process.env,
      `Expected configuration in node process (because hasConfig() returned true), but process.env was missing. Did you call getConfig() without first calling hasConfig()?`
    );

    return globalThis.process.env;
  }

  description(_state: NodeJS.ProcessEnv, { key }: StarbeamParse): string {
    return `process.env.${pascalCase(key)}`;
  }

  insert(env: NodeJS.ProcessEnv, value: StarbeamInsertion): void {
    switch (value.hint) {
      case "boolean":
      case "number":
        env[pascalCase(value.key)] = String(value.value);
        break;
      case "string":
        env[pascalCase(value.key)] = value.value;
        break;
      default:
        exhaustive(value);
    }
  }

  parse(
    env: NodeJS.ProcessEnv,
    parseKey: StarbeamParse
  ): string | number | boolean | undefined {
    let key = pascalCase(parseKey.key);

    switch (parseKey.hint) {
      case "boolean": {
        return key in env && env[key] !== "false";
      }
      case "number": {
        let number = env[key];
        return number === undefined ? undefined : Number(number);
      }
      case "string": {
        return env[key];
      }
      default:
        exhaustive(parseKey);
    }
  }
}

export const ENV_VAR_CONFIG = ConfigEnvironment.create(EnvVarConfig.create());

function pascalCase<S extends string>(string: S): PascalCase<S> {
  return string.replace(
    /(\w)(\w*)/g,
    (g0, g1: string, g2: string) => g1.toUpperCase() + g2.toLowerCase()
  ) as InferReturn;
}

type PascalCase<T extends string, SoFar extends string = ""> =
  // CamelCase<string> => string
  string extends T
    ? string
    : // If this is the first character, capitalize it
    "" extends SoFar
    ? T extends `${infer F}${infer Rest}`
      ? PascalCase<Rest, F>
      : never
    : // Otherwise, if the next character is `_`, the next-next character should be capitalized
    T extends `_${infer F}${infer Rest}`
    ? PascalCase<Rest, `${SoFar}${F}`>
    : // Otherwise, the next character should be lowercased
    T extends `${infer F}${infer Rest}`
    ? PascalCase<Rest, `${SoFar}${Lowercase<F>}`>
    : // If we have no characters left, we've accumulated everything into SoFar
      SoFar;
